const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const https = require("https");

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    const { deviceId, acceleration, tilt, gyro } = body;

    if (!deviceId) return { statusCode: 400, body: "Missing deviceId" };

    try {
        // 1. Ambil data terakhir
        const prevData = await db.send(new QueryCommand({
            TableName: "events",
            IndexName: "deviceId-index",
            KeyConditionExpression: "deviceId = :id",
            ExpressionAttributeValues: { ":id": deviceId },
            ScanIndexForward: false,
            Limit: 1
        }));

        const lastItem = prevData.Items?.[0];
        
        // 2. Algoritma Deteksi
        let currentStatus = (acceleration > 12 || tilt > 50) ? "SUSPICIOUS" : "SAFE";
        let alertStatus = currentStatus === "SUSPICIOUS" ? "PENDING" : "NONE";
        let targetTimestamp = Date.now();

        // 3. Logika Transisi (Memanggil fungsi Broadcast)
        if (currentStatus === "SUSPICIOUS") {
            if (!lastItem || lastItem.alertStatus === "NONE" || lastItem.alertStatus === "CANCELLED") {
                try {
                    // SUDAH DIPERBAIKI: Menggunakan sendLineBroadcast
                    await sendLineBroadcast(`🚨 【系統警報】\n偵測到疑似事故！\n\n您是否需要協助？\n👉 請點擊下方選單回報！`);
                } catch (lineErr) {
                    console.error("LINE Error (Push 1):", lineErr.message);
                }
            } 
            else if (lastItem.alertStatus === "PENDING") {
                const secondsPassed = (Date.now() - lastItem.timestamp) / 1000;
                if (secondsPassed > 90) {
                    currentStatus = "EMERGENCY";
                    alertStatus = "ALERTED";
                    try {
                        // SUDAH DIPERBAIKI: Menggunakan sendLineBroadcast
                        await sendLineBroadcast("🚨 【緊急通報】\n使用者 90 秒內未回應，系統已自動通報！");
                    } catch (lineErr) {
                        console.error("LINE Error (Emergency):", lineErr.message);
                    }
                } else {
                    targetTimestamp = lastItem.timestamp;
                }
            }
        }

        // 4. SIMPAN KE DYNAMODB
        const itemToSave = {
            eventId: `evt-${Date.now()}`,
            deviceId,
            acceleration: acceleration || 0,
            tilt: tilt || 0,
            gyro: gyro || 0,
            status: currentStatus,
            alertStatus: alertStatus,
            timestamp: targetTimestamp
        };

        await db.send(new PutCommand({
            TableName: "events",
            Item: itemToSave
        }));

        return { 
            statusCode: 200, 
            body: JSON.stringify({ message: "Data saved", status: currentStatus, alertStatus }) 
        };

    } catch (err) {
        console.error("Global Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};

// Fungsi Helper Broadcast
async function sendLineBroadcast(message) {
    const token = process.env.LINE_TOKEN;
    if (!token) throw new Error("LINE_TOKEN is missing");

    const data = JSON.stringify({
        messages: [{ type: "text", text: message }]
    });

    const options = {
        hostname: "api.line.me",
        path: "/v2/bot/message/broadcast",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Content-Length": Buffer.byteLength(data)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let resData = "";
            res.on("data", (chunk) => { resData += chunk; });
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`LINE Broadcast Error ${res.statusCode}: ${resData}`));
                }
            });
        });
        req.on("error", (e) => reject(e));
        req.write(data);
        req.end();
    });
}
