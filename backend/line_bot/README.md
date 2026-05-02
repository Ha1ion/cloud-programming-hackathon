# 💬 LINE Bot 互動服務 (AIoT 校園滑板車系統)

本微服務負責在系統判定為潛在事故 (`SUSPICIOUS`) 時，即時透過 LINE 官方帳號推播警報給使用者，並提供「圖文選單」接收使用者的狀態回報（我沒事 / 需要協助），進而觸發後續的通報流程。

## 🛠️ 本機環境建置與啟動

本專案使用 Python 3.9+ 與 Flask。請在 `backend/line_bot` 目錄下執行：

### 1. 啟動虛擬環境與安裝套件

```bash
# 建立並啟動 venv (Windows)
python -m venv venv
.\venv\Scripts\activate

# 建立並啟動 venv (macOS/Linux)
python3 -m venv venv
source venv/bin/activate

# 安裝依賴套件
pip install -r requirements.txt
```

### 2. 環境變數設定 (.env)

在 `line_bot` 目錄下建立 `.env` 檔案（請勿 commit 到版控）：

```env
LINE_CHANNEL_SECRET=你的_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN=你的_ACCESS_TOKEN
```

### 3. 啟動伺服器與 ngrok

請開啟兩個終端機視窗：

```powershell
# 終端機 A：啟動 Flask API
python app.py

# 終端機 B：啟動 ngrok 產生外部網址
.\ngrok http 5000
```

> **設定 Webhook**：將 ngrok 產生的 `https://...` 網址加上 `/callback` 後，填入 LINE Developers 的 Webhook URL 欄位。

---

## 📡 API 串接規格 (API List)

以下定義 LINE Bot 與雲端後端 (AWS) 之間的溝通橋樑。

### 📌 1. 【後端呼叫 Bot】觸發事故推播警報

當後端判定發生疑似事故時，呼叫此 API，Bot 將主動傳送含有按鈕的警報訊息給使用者。

- **URL**: `POST /trigger-alert`
- **Content-Type**: `application/json`

**Request Body**:
```json
{
  "user_id": "U3xxxxxxxxxxxxxxxxx",  // (必填) 目標使用者的 LINE ID
  "event_id": "evt_001"              // (必填) 該次事故事件的唯一 ID
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Alert pushed to LINE successfully!"
}
```

### 📌 2. 【Bot 呼叫後端】更新事件狀態 (⚠️ 需由後端實作)

當使用者在 LINE 點擊「我沒事(SAFE)」或「需要協助(EMERGENCY)」時，Bot 會打向後端此 API 以更新 DynamoDB 狀態。

- **預期 URL**: `POST /events/<event_id>/status` (路徑可依後端設計調整)

**預期 Request Body**:
```json
{
  "status": "SAFE",                  
  "user_id": "U3xxxxxxxxxxxxxxxxx"
}
```
*(註：目前於黑客松開發階段，Bot 內暫以 `print()` 模擬此呼叫，待後端 API Ready 後將解除註解並串上)*

### 📌 3. 【LINE 官方呼叫】Webhook 端點

處理使用者在 LINE App 內發送的所有文字與圖文選單點擊行為。

- **URL**: `POST /callback`

*(無需手動呼叫，此 API 已實作給 LINE 平台呼叫)*