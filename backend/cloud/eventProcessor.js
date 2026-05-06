const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const https = require("https");

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        console.log("Raw IoT Event:", JSON.stringify(event));
        
        // 1. Parsing Data (Menangani input dari IoT Core atau Test Console)
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
        
        // Ambil data berdasarkan struktur baru dari temanmu
        const deviceId = body.device_id || body.deviceId; 
        const accelRaw = body.accel;
        const gyroRaw = body.gyro;

        if (!deviceId || !accelRaw) {
            return { statusCode: 400, body: "Missing device_id or accel data" };
        }

        // 2. Kalkulasi Nilai Fisik
        // Acceleration Resultant: sqrt(x^2 + y^2 + z^2)
        const acceleration = Math.sqrt(
            Math.pow(accelRaw.x, 2) + Math.pow(accelRaw.y, 2) + Math.pow(accelRaw.z, 2)
        ) * 9.8; // Konversi ke m/s^2

        // Tilt (Kemiringan): Menghitung sudut terhadap sumbu Z
        const totalG = Math.sqrt(Math.pow(accelRaw.x, 2) + Math.pow(accelRaw.y, 2) + Math.pow(accelRaw.z, 2));
        const tilt = Math.acos(accelRaw.z / totalG) * (180 / Math.PI);

        // Gyro Magnitude
        const gyro = gyroRaw ? Math.sqrt(Math.pow(gyroRaw.x, 2) + Math.pow(gyroRaw.y, 2) + Math.pow(gyroRaw.z, 2)) : 0;

        console.log(`Processed -> Accel: ${acceleration.toFixed(2)}, Tilt: ${tilt.toFixed(2)}`);

        // 3. Ambil data terakhir dari DynamoDB untuk cek status sebelumnya
        const prevData = await db.send(new QueryCommand({
            TableName: "events",
            IndexName: "deviceId-index",
            KeyConditionExpression: "deviceId = :id",
            ExpressionAttributeValues: { ":id": deviceId },
            ScanIndexForward: false,
            Limit: 1
        }));

        const lastItem = prevData.Items?.[0];
        
        // 4. Algoritma Deteksi
        let currentStatus = (acceleration > 12 || tilt > 50) ? "SUSPICIOUS" : "SAFE";
        let alertStatus = currentStatus === "SUSPICIOUS" ? "PENDING" : "NONE";
        
        let targetTimestamp = Date.now(); 
        let shouldUpdateLastItem = false;

        if (currentStatus === "SUSPICIOUS") {
            // A. KEJADIAN BARU (Sebelumnya aman atau tidak ada data)
            if (!lastItem || lastItem.alertStatus === "NONE" || lastItem.alertStatus === "CANCELLED") {
                console.log("Kondisi: Suspicious baru terdeteksi.");
                try {
                    await sendLineBroadcast(`🚨 【警報】偵測到疑似事故！\n請回報您的安全狀態，否則系統將在 90 秒後自動通報。`);
                } catch (e) { console.error("LINE Error:", e.message); }
            } 
            // B. LANJUTAN KEJADIAN (Sedang dalam masa tunggu 90 detik)
            else if (lastItem.alertStatus === "PENDING") {
                targetTimestamp = lastItem.timestamp; // KUNCI TIMESTAMP LAMA
                const secondsPassed = (Date.now() - targetTimestamp) / 1000;
                
                console.log(`Masa tunggu: ${secondsPassed.toFixed(0)} detik.`);

                if (secondsPassed > 90) { 
                    currentStatus = "EMERGENCY";
                    alertStatus = "ALERTED";
                    shouldUpdateLastItem = true;
                    try {
                        await sendLineBroadcast("🚨 【緊急通報】使用者 90 秒內未回應，系統已自動通報校安中心！");
                    } catch (e) {}
                } else {
                    // Masih dalam 90 detik, update data sensor saja
                    shouldUpdateLastItem = true;
                }
            }
            // C. SUDAH EMERGENCY (Abaikan data sensor selanjutnya agar tidak nyampah)
            else if (lastItem.alertStatus === "ALERTED") {
                return { statusCode: 200, body: "Status locked in EMERGENCY" };
            }
        }

        // 5. SIMPAN / UPDATE KE DYNAMODB
        if (shouldUpdateLastItem && lastItem) {
            // UPDATE: Gunakan ID yang sama agar tidak dobel
            await db.send(new UpdateCommand({
                TableName: "events",
                Key: { eventId: lastItem.eventId },
                UpdateExpression: "SET #st = :s, alertStatus = :a, acceleration = :acc, tilt = :t, gyro = :g",
                ExpressionAttributeNames: { "#st": "status" },
                ExpressionAttributeValues: {
                    ":s": currentStatus,
                    ":a": alertStatus,
                    ":acc": acceleration,
                    ":t": tilt,
                    ":g": gyro
                }
            }));
            console.log("Existing item updated.");
        } else {
            // PUT: Buat baris baru (untuk SAFE atau awal SUSPICIOUS)
            await db.send(new PutCommand({
                TableName: "events",
                Item: {
                    eventId: `evt-${Date.now()}`,
                    deviceId,
                    acceleration,
                    tilt,
                    gyro,
                    status: currentStatus,
                    alertStatus: alertStatus,
                    timestamp: targetTimestamp // Timestamp awal kecelakaan
                }
            }));
            console.log("New item created.");
        }

        return { 
            statusCode: 200, 
            body: JSON.stringify({ deviceId, status: currentStatus, alertStatus }) 
        };

    } catch (err) {
        console.error("Global Error:", err);
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
