# 使用輕量級的 Python 3.9 映像檔
FROM python:3.9-slim

# 設定工作目錄
WORKDIR /app

# 複製依賴清單並安裝套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製專案的所有程式碼到容器內
COPY . .

# 曝露 Flask 預設的 5000 port
EXPOSE 5000

# 啟動應用程式
CMD ["python", "app.py"]