import os
import requests
from flask import Flask, request, abort, jsonify
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

line_bot_api = LineBotApi(os.getenv('LINE_CHANNEL_ACCESS_TOKEN'))
handler = WebhookHandler(os.getenv('LINE_CHANNEL_SECRET'))


@app.route("/", methods=['GET'])
def health_check():
    return "LINE Bot Webhook Server is running!"

# [API 1] 給 LINE 官方呼叫的 Webhook (接收使用者回覆)
@app.route("/callback", methods=['POST'])
def callback():
    signature = request.headers['X-Line-Signature']
    body = request.get_data(as_text=True)
    app.logger.info("Request body: " + body)

    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)

    return 'OK'

# 處理文字訊息 (包含圖文選單傳來的文字)
@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    user_msg = event.message.text
    user_id = event.source.user_id 
    
    backend_domain = "https://p4oudlfhnd.execute-api.ap-southeast-2.amazonaws.com/dev/status/pi_01"
    device_id = "pi_01" # 假設的裝置 ID
    backend_api_url = f"{backend_domain}/status/{device_id}"

    if user_msg == "我沒事":
        print(f"[{user_id}] 傳送 API 至後端: 更新狀態為 SAFE, 取消警報")
        
        payload = {"status": "SAFE", "user_id": user_id}
        try:
            requests.post(backend_api_url, json=payload)
        except Exception as e:
            print(f"呼叫後端 API 發生錯誤: {e}")
            
        reply_text = "🟢 已收到您的回報！目前狀態已更新為：安全 (SAFE)。\n警報已解除，請安心騎乘！"
        
    elif user_msg == "需要協助":
        print(f"[{user_id}] 傳送 API 至後端: 觸發緊急通報 EMERGENCY")
        
        payload = {"status": "EMERGENCY", "user_id": user_id}
        try:
            requests.post(backend_api_url, json=payload)
        except Exception as e:
            print(f"呼叫後端 API 發生錯誤: {e}")
            
        reply_text = "🚨 系統已收到求救訊號！\n正在為您通報校安中心與緊急聯絡人，請留在安全處等待救援！"
        
    elif user_msg == "我的狀態":
        reply_text = "🛴 您的滑板車目前連線中，感測器運作正常。"

    elif user_msg == "即時路段預警":
        reply_text = "🌧️ 【環境風險預警】\n\n目前校園環境資料：\n🌡️ 溫度：22°C\n💧 濕度：88%\n\n⚠️ 系統判定：成功湖周邊及女宿下坡路段目前為「高風險濕滑區域」，請減速慢行！"
        
    elif user_msg == "校園安全地圖":
        dashboard_url = "http://ec2-3-27-62-158.ap-southeast-2.compute.amazonaws.com"
        reply_text = f"🗺️ 【校園安全 Dashboard】\n\n點擊下方連結查看即時事故熱點與高風險路段視覺化地圖：\n{dashboard_url}"

    elif user_msg == "緊急聯絡人設定":
        reply_text = "此功能建置中，敬請期待期末完整版！\n您的 LINE User ID 為：\n" + user_id
        
    else:
        reply_text = f"系統已收到您的訊息：{user_msg}"

    line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(text=reply_text)
    )

# [API 2] 給後端呼叫的觸發器 (事故發生時觸發推播)
@app.route("/trigger-alert", methods=['POST'])
def trigger_alert():
    data = request.json
    target_user_id = data.get("user_id") 
    event_id = data.get("event_id")
    
    if not target_user_id:
        return jsonify({"status": "error", "message": "Missing user_id"}), 400

    try:
        alert_msg = f"🚨 【系統警報】\n偵測到疑似滑板車事故！(事件代號: {event_id})\n\n您是否需要協助？\n👉 請點擊下方選單的「我沒事」或「需要協助」來回報狀態！\n\n(系統將於 90 秒後自動通報)"
        
        line_bot_api.push_message(
            target_user_id,
            TextSendMessage(text=alert_msg)
        )
        return jsonify({"status": "success", "message": "Alert pushed to LINE successfully!"}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)