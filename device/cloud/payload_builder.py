import time
from config import DEVICE_ID, SAMPLING_RATE_HZ

def build_imu_payload(imu_data, sequence):
    return {
        "device_id": DEVICE_ID,
        "timestamp": int(time.time() * 1000),
        "sequence": sequence,
        "data_type": "imu_raw",
        "sampling_rate_hz": SAMPLING_RATE_HZ,
        "accel": {
            "x": imu_data["accel"]["x"],
            "y": imu_data["accel"]["y"],
            "z": imu_data["accel"]["z"],
            "unit": "g"
        },
        "gyro": {
            "x": imu_data["gyro"]["x"],
            "y": imu_data["gyro"]["y"],
            "z": imu_data["gyro"]["z"],
            "unit": "deg/s"
        }
    }
