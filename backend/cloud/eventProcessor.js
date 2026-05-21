const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const https = require("https");

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    const { deviceId, acceleration, tilt, gyro, humidity } = body;

    if (!deviceId) {
        console.error("Error: deviceId is missing");
        return { statusCode: 400, body: "Missing deviceId" };
    }

    console.log(`[Processing] Device: ${deviceId}, Accel: ${acceleration}, Tilt: ${tilt}, Humidity: ${humidity}%`);

    try {
        // 1. Ambil data terakhir untuk memantau state transisi & waktu notifikasi hujan
        const prevData = await db.send(new QueryCommand({
            TableName: "events",
            IndexName: "deviceId-index",
            KeyConditionExpression: "deviceId = :id",
            ExpressionAttributeValues: { ":id": deviceId },
            ScanIndexForward: false,
            Limit: 1
        }));

        const lastItem = prevData.Items?.[0];
        
        // 2. Tentukan status dari sensor saat ini
        let currentStatus = (acceleration > 12 || tilt > 50) ? "SUSPICIOUS" : "SAFE";
        let alertStatus = currentStatus === "SUSPICIOUS" ? "PENDING" : "NONE";
        
        let now = Date.now();
        let targetTimestamp = now; 
        let lastRainNotification = lastItem?.lastRainNotification || 0;

        // --- LOGIKA NOTIFIKASI HUJAN (TETAP TERUPDATE DI ROW TERAKHIR) ---
        const HUMIDITY_THRESHOLD = 85; 
        if (humidity && humidity >= HUMIDITY_THRESHOLD) {
            const oneHourInMs = 60 * 60 * 1000;
            const timeSinceLastNotification = now - lastRainNotification;

            if (timeSinceLastNotification >= oneHourInMs) {
                console.log(`[RAIN DETECTED] Sending LINE notification.`);
                try {
                    await sendLineBroadcast(`🌧️ 【氣象警報】偵測到高濕度 (${humidity}%)，目前可能正在下雨，路面濕滑請減速慢行！`);
                    lastRainNotification = now; 
                } catch (e) { console.error("LINE Rain Error:", e.message); }
            } else {
                console.log(`[RAIN DETECTED] Throttled. Wait ${((oneHourInMs - timeSinceLastNotification) / 60000).toFixed(0)} mins.`);
            }
        }

        // --- LOGIKA UTAMA SENSOR & TRANSISI TIMESTAMPS ---
        let shouldCreateNewRow = false;
        let eventIdToUpdate = lastItem?.eventId;

        if (!lastItem) {
            // Belum ada data sama sekali di DB
            shouldCreateNewRow = true;
        } else if (lastItem.alertStatus === "ALERTED") {
            // Jika sudah terkunci di EMERGENCY, abaikan atau tunggu sampai sistem direset
            console.log("Status: Already in Emergency mode");
            return { statusCode: 200, body: "Status locked in EMERGENCY" };
        } else {
            // Kasus data lama sudah ada
            if (currentStatus === "SUSPICIOUS") {
                if (lastItem.status === "SAFE" || lastItem.alertStatus === "CANCELLED") {
                    // Skenario A: Baru masuk fase SUSPICIOUS dari SAFE. 
                    // BUAT baris baru agar timestamp kecelakaan ini murni tercatat dari nol.
                    console.log("Status: New Incident Detected. Starting 90s countdown.");
                    shouldCreateNewRow = true;
                    targetTimestamp = now; // Waktu kecelakaan dimulai
                    try {
                        await sendLineBroadcast(`🚨 【警報】偵測到疑似事故！\n請回報您的安全狀態，否則系統將在 90 秒後自動通報。`);
                    } catch (e) { console.error("LINE Broadcast Error:", e.message); }
                } else if (lastItem.alertStatus === "PENDING") {
                    // Skenario B: Melanjutkan PENDING yang lama.
                    // UPDATE baris yang sama & TETAPKAN timestamp lama agar aturan 90 detik terealisasi.
                    targetTimestamp = lastItem.timestamp; 
                    const secondsPassed = (now - targetTimestamp) / 1000;
                    console.log(`Status: Pending Incident. Elapsed: ${secondsPassed.toFixed(0)}s`);

                    if (secondsPassed > 90) { 
                        currentStatus = "EMERGENCY";
                        alertStatus = "ALERTED";
                        try {
                            await sendLineBroadcast("🚨 【緊急通報】使用者 90 秒內未回應，系統已自動通報校安中心！");
                        } catch (e) { console.error("LINE Emergency Error:", e.message); }
                    }
                }
            } else {
                // Jika kondisi sensor saat ini SAFE
                if (lastItem.alertStatus === "PENDING") {
                    // Jika sebelumnya PENDING tapi sekarang sudah SAFE (Berhasil pulih sendiri sebelum 90 detik)
                    console.log("Status: Device recovered to SAFE.");
                    currentStatus = "SAFE";
                    alertStatus = "CANCELLED";
                    targetTimestamp = lastItem.timestamp; // Pertahankan waktu insiden tersebut sebagai riwayat
                } else {
                    // Jika sebelumnya SAFE dan sekarang tetap SAFE.
                    // UPDATE baris yang sama agar data kelembaban diperbarui tanpa merusak/membuat banyak baris baru.
                    targetTimestamp = lastItem.timestamp; 
                }
            }
        }

        // 3. Eksekusi ke DynamoDB
        if (shouldCreateNewRow) {
            await db.send(new PutCommand({
                TableName: "events",
                Item: {
                    eventId: `evt-${now}`,
                    deviceId,
                    acceleration: acceleration || 0,
                    tilt: tilt || 0,
                    gyro: gyro || 0,
                    humidity: humidity || 0,
                    status: currentStatus,
                    alertStatus: alertStatus,
                    timestamp: targetTimestamp,
                    lastRainNotification: lastRainNotification
                }
            }));
            console.log("Insert Success: New log lifecycle created.");
        } else {
            await db.send(new UpdateCommand({
                TableName: "events",
                Key: { eventId: eventIdToUpdate },
                UpdateExpression: "SET #st = :s, alertStatus = :a, acceleration = :acc, tilt = :t, gyro = :g, humidity = :h, lastRainNotification = :lrn, #ts = :ts",
                ExpressionAttributeNames: { "#st": "status", "#ts": "timestamp" },
                ExpressionAttributeValues: {
                    ":s": currentStatus,
                    ":a": alertStatus,
                    ":acc": acceleration || 0,
                    ":t": tilt || 0,
                    ":g": gyro || 0,
                    ":h": humidity || 0,
                    ":lrn": lastRainNotification,
                    ":ts": targetTimestamp // Hanya terupdate maju jika 'shouldCreateNewRow' aktif
                }
            }));
            console.log("Update Success: Data updated on current active row.");
        }

        return { 
            statusCode: 200, 
            body: JSON.stringify({ deviceId, status: currentStatus, alertStatus, humidity }) 
        };

    } catch (err) {
        console.error("Critical Runtime Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};

// Fungsi Helper Broadcast LINE
async function sendLineBroadcast(message) {
    const token = process.env.LINE_TOKEN;
    if (!token) throw new Error("LINE_TOKEN environment variable is missing");
    const data = JSON.stringify({ messages: [{ type: "text", text: message }] });
    const options = {
        hostname: "api.line.me",
        path: "/v2/bot/message/broadcast",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Content-Length": Buffer.byteLength(data)
        },
        timeout: 5000
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let resBody = "";
            res.on("data", (chunk) => { resBody += chunk; });
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) resolve();
                else reject(new Error(`LINE API Error ${res.statusCode}: ${resBody}`));
            });
        });
        req.on("error", (e) => reject(e));
        req.on("timeout", () => { req.destroy(); reject(new Error("LINE API Timeout")); });
        req.write(data);
        req.end();
    });
}
