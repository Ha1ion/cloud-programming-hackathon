# 🛴 AIoT 校園滑板車事故偵測與自動通報系統

本專案為「雲端與程式設計黑客松」參賽作品。我們結合邊緣運算 (Edge Computing)、雲端架構 (Cloud) 與 LINE Bot 聊天機器人，打造一套保障校園微型交通工具（如電動滑板車）騎乘安全的完整解決方案。

## 🌟 專案亮點與系統架構

當使用者騎乘滑板車發生跌倒或劇烈撞擊時，系統將自動偵測、雲端判讀並透過 LINE 官方帳號向使用者確認平安；若超時未回覆或點選「需要協助」，系統將自動通報校安中心與緊急聯絡人。

**【核心架構流程】**
1. **Edge (邊緣端)**：Raspberry Pi 結合 IMU 感測器，即時監控姿態與加速度。
2. **Cloud (雲端端)**：AWS 接收 MQTT 資料，Lambda 負責邏輯判定並更新 DynamoDB。
3. **App/Bot (互動端)**：LINE Bot 擔任推播警報與接收使用者回饋的橋樑。

## 📂 專案資料夾結構 (Monorepo)

本專案採用 Monorepo 結構管理所有服務的程式碼，各模組的詳細說明請參閱其資料夾內的 `README.md`：

```text
cloud-programming-hackathon/
├── edge_device/          # 樹莓派硬體端程式碼 (感測器資料擷取、MQTT 發布)
├── backend/
│   ├── cloud/            # AWS Lambda、API Gateway 等雲端後端程式碼
│   └── line_bot/         # LINE Bot 互動服務 (推播、Webhook 處理)
├── frontend/             # 校園安全地圖 Dashboard 
└── README.md             
```

## 快速啟動指南

啟動 LINE Bot 服務

啟動 Edge 裝置與感測器 (建置中)

部署 AWS 雲端資源 (建置中)