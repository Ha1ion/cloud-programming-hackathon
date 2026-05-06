const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const https = require("https");

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        // 1. Ambil data yang sudah jadi (sudah berupa angka skalar)
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
        const { deviceId, acceleration, tilt, gyro } = body;

        if (!deviceId) return { statusCode: 400, body: "Missing deviceId" };

        console.log(`Input Data - Device: ${deviceId}, Accel: ${acceleration}, Tilt: ${tilt}`);

        // 2. Ambil data terakhir untuk cek status kejadian sebelumnya
        const prevData = await db.send(new QueryCommand({
            TableName: "events",
            IndexName: "deviceId-index",
            KeyConditionExpression: "deviceId = :id",
            ExpressionAttributeValues: { ":id": deviceId },
            ScanIndexForward: false,
            Limit: 1
        }));

        const lastItem = prevData.Items?.[0];
        
        // 3. Tentukan Status Berdasarkan Nilai Jadi
        let currentStatus = (acceleration > 12 || tilt > 50) ? "SUSPICIOUS" : "SAFE";
        let alertStatus = currentStatus === "SUSPICIOUS" ? "PENDING" : "NONE";
        
        let targetTimestamp = Date.now(); 
        let shouldUpdateLastItem = false;

        if (currentStatus === "SUSPICIOUS") {
            // A. Kejadian Baru
            if (!lastItem || lastItem.alertStatus === "NONE" || lastItem.alertStatus === "CANCELLED") {
                try {
                    await sendLineBroadcast(`🚨 【警報】偵測到疑似事故！\n請回報您的安全狀態，否則系統將在 90 秒後自動通報。`);
                } catch (e) { console.error("LINE Error:", e.message); }
            } 
            // B. Melanjutkan Kejadian PENDING (Menghitung 90 detik)
            else if (lastItem.alertStatus === "PENDING") {
                targetTimestamp = lastItem.timestamp; // <--- KUNCI TIMESTAMP AWAL
                const secondsPassed = (Date.now() - targetTimestamp) / 1000;
                
                console.log(`Elapsed Time: ${secondsPassed.toFixed(0)}s`);

                if (secondsPassed > 90) { 
                    currentStatus = "EMERGENCY";
                    alertStatus = "ALERTED";
                    shouldUpdateLastItem = true;
                    try {
                        await sendLineBroadcast("🚨 【緊急通報】使用者 90 秒內未回應，系統已自動通報校安中心！");
                    } catch (e) {}
                } else {
                    // Masih dalam masa tunggu, update nilai sensor terbaru ke baris yang sama
                    shouldUpdateLastItem = true;
                }
            }
            // C. Sudah Terkunci di EMERGENCY
            else if (lastItem.alertStatus === "ALERTED") {
                return { statusCode: 200, body: "Status locked in EMERGENCY" };
            }
        }

        // 4. Simpan atau Update ke DynamoDB
        if (shouldUpdateLastItem && lastItem) {
            // Update Baris yang Sama (Data sensor terbaru masuk, tapi timestamp tetap lama)
            await db.send(new UpdateCommand({
                TableName: "events",
                Key: { eventId: lastItem.eventId },
                UpdateExpression: "SET #st = :s, alertStatus = :a, acceleration = :acc, tilt = :t, gyro = :g",
                ExpressionAttributeNames: { "#st": "status" },
                ExpressionAttributeValues: {
                    ":s": currentStatus,
                    ":a": alertStatus,
                    ":acc": acceleration || 0,
                    ":t": tilt || 0,
                    ":g": gyro || 0
                }
            }));
            console.log("Updated existing incident record.");
        } else {
            // Buat Baris Baru (Jika SAFE atau awal mula SUSPICIOUS)
            await db.send(new PutCommand({
                TableName: "events",
                Item: {
                    eventId: `evt-${Date.now()}`,
                    deviceId,
                    acceleration: acceleration || 0,
                    tilt: tilt || 0,
                    gyro: gyro || 0,
                    status: currentStatus,
                    alertStatus: alertStatus,
                    timestamp: targetTimestamp // Menyimpan waktu awal kejadian
                }
            }));
            console.log("New record created.");
        }

        return { 
            statusCode: 200, 
            body: JSON.stringify({ deviceId, status: currentStatus, alertStatus }) 
        };

    } catch (err) {
        console.error("Critical Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};

// Fungsi Helper Broadcast LINE
async function sendLineBroadcast(message) {
    const data = JSON.stringify({ messages: [{ type: "text", text: message }] });
    const options = {
        hostname: "api.line.me",
        path: "/v2/bot/message/broadcast",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.LINE_TOKEN}`,
            "Content-Length": Buffer.byteLength(data)
        }
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            res.on("end", () => resolve());
        });
        req.on("error", (e) => reject(e));
        req.write(data);
        req.end();
    });
}
