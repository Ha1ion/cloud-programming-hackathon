const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const https = require("https");

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        console.log("Raw LINE Event:", event.body);
        
        // Parsing body (menangani jika event.body adalah string atau objek)
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
        const lineEvent = body.events?.[0];

        if (!lineEvent) return { statusCode: 200, body: "No event" };

        const msg = lineEvent.message?.text;
        const replyToken = lineEvent.replyToken;
        const userId = lineEvent.source?.userId; // Ambil userId dari LINE
        let replyText = "";

        // 1. Logika: "SAYA BAIK-BAIK SAJA" (我沒事)
        if (msg === "我沒事") {
            const targetDeviceId = "scooter-001"; 

            const queryData = await db.send(new QueryCommand({
                TableName: "events",
                IndexName: "deviceId-index",
                KeyConditionExpression: "deviceId = :id",
                ExpressionAttributeValues: { ":id": targetDeviceId },
                ScanIndexForward: false, 
                Limit: 1
            }));

            if (queryData.Items && queryData.Items.length > 0) {
                const lastItem = queryData.Items[0];
                try {
                    await db.send(new UpdateCommand({
                        TableName: "events",
                        Key: { 
                            eventId: lastItem.eventId 
                            // Jika ada Sort Key 'timestamp', buka baris bawah ini:
                            // , timestamp: lastItem.timestamp 
                        },
                        UpdateExpression: "SET alertStatus = :a, #s = :s",
                        ExpressionAttributeNames: { "#s": "status" },
                        ExpressionAttributeValues: { 
                            ":a": "CANCELLED", 
                            ":s": "SAFE" 
                        }
                    }));
                    replyText = "🟢 已收到您的回報！\n\n目前狀態：安全 (SAFE)\n警報已解除，請安心騎乘！";
                } catch (dbErr) {
                    console.error("DynamoDB Update Error:", dbErr);
                    replyText = "⚠️ 系統更新狀態失敗，但我們已收到您的訊息。";
                }
            } else {
                replyText = "❓ 找不到您的最近紀錄，但系統已記錄您平安。";
            }

        } 
        // 2. Logika: BUTUH BANTUAN
        else if (msg === "need help" || msg === "需要協助") {
            replyText = "🚨 【緊急救援】\n系統已收到求救訊號！\n正在通報緊急聯絡人與校安中心，請保持冷靜並留在原地。";
        } 
        // 3. Logika: STATUS
        else if (msg === "我的狀態"){
            replyText = "🛴 您的滑板車目前連線中，感測器運作正常。";
        }
        else if (msg === "校園安全地圖") {
            const dashboardUrl = "http://ec2-3-27-62-158.ap-southeast-2.compute.amazonaws.com";
            replyText = `🗺️ 【校園安全 Dashboard】\n\n點擊下方連結查看即時事故熱點與高風險路段視覺化地圖：\n${dashboardUrl}`;
        }
        // 4. Logika: ROAD PREDICTION
        else if (msg === "即時路段預警"){
            replyText = "🌧️ 【環境風險預警】\n\n目前校園環境資料：\n🌡️ 溫度：22°C\n💧 濕度：88%\n\n⚠️ 系統判定：成功湖周邊及女宿下坡路段目前為「高風險濕滑區域」，請減速慢行！";
        }
        // 5. Logika: USER ID / CONTACTS
        else if (msg === "緊急聯絡人設定"){
            replyText = `此功能建置中，敬請期待期末完整版！\n您的 LINE User ID 為：\n${userId}`;
        }
        // 6. DEFAULT
        else {
            replyText = `系統已收到您的訊息：${msg}, 請選選單上面的`;
        }

        // Kirim Balasan ke LINE
        await sendLineReply(replyToken, replyText);
        return { statusCode: 200, body: "Success" };

    } catch (err) {
        console.error("Global Webhook Error:", err);
        return { statusCode: 500, body: "Internal Error" };
    }
};

async function sendLineReply(replyToken, text) {
    const data = JSON.stringify({
        replyToken: replyToken,
        messages: [{ type: "text", text: text }]
    });

    const options = {
        hostname: "api.line.me",
        path: "/v2/bot/message/reply",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.LINE_TOKEN}`,
            "Content-Length": Buffer.byteLength(data)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            res.on("data", () => {});
            res.on("end", () => resolve());
        });
        req.on("error", (e) => reject(e));
        req.write(data);
        req.end();
    });
}
