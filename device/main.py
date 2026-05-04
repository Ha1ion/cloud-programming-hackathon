import time

from sensors.mock_imu import MockIMU
from sensors.mpu6050_reader import MPU6050Reader
from cloud.payload_builder import build_imu_payload
from cloud.mqtt_publisher import MQTTPublisher
from config import PUBLISH_INTERVAL_SECONDS, USE_MOCK_IMU

def main():
    if USE_MOCK_IMU:
        print("Using Mock IMU")
        imu = MockIMU()
    else:
        print("Using MPU6050")
        imu = MPU6050Reader()

    mqtt = MQTTPublisher()
    mqtt.connect()

    sequence = 0

    while True:
        imu_data = imu.read()
        payload = build_imu_payload(imu_data, sequence)

        mqtt.publish_imu(payload)

        sequence += 1
        time.sleep(PUBLISH_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
