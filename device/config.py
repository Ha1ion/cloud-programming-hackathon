from pathlib import Path

# =========================
# Device Settings
# =========================

DEVICE_ID = "scooter-001"

SAMPLING_RATE_HZ = 10
PUBLISH_INTERVAL_SECONDS = 0.1

USE_MOCK_IMU = False

# =========================
# AWS IoT Core Settings
# =========================

AWS_IOT_ENDPOINT = "a2q0c2pnlqqvd4-ats.iot.us-east-1.amazonaws.com"
AWS_IOT_PORT = 8883

MQTT_TOPIC_IMU = f"campus/safety/{DEVICE_ID}/imu"


# =========================
# Certificate Paths
# =========================

# config.py 位置：
# /home/rcu0613/smart-campus/device/config.py
#
# Path(__file__).resolve().parent       = /home/rcu0613/smart-campus/device
# Path(__file__).resolve().parent.parent = /home/rcu0613/smart-campus

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CERT_DIR = PROJECT_ROOT / "certs"

ROOT_CA_PATH = str(CERT_DIR / "AmazonRootCA1.pem")
CERT_PATH = str(CERT_DIR / "device.pem.crt")
PRIVATE_KEY_PATH = str(CERT_DIR / "private.pem.key")
