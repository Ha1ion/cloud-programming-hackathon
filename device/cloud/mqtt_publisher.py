import json
import time
import paho.mqtt.client as mqtt

from config import (
    DEVICE_ID,
    AWS_IOT_ENDPOINT,
    AWS_IOT_PORT,
    MQTT_TOPIC_IMU,
    ROOT_CA_PATH,
    CERT_PATH,
    PRIVATE_KEY_PATH
)


class MQTTPublisher:
    def __init__(self):
        self.connected = False

        self.client = mqtt.Client(
            client_id=DEVICE_ID,
            protocol=mqtt.MQTTv311
        )

        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect

        self.client.tls_set(
            ca_certs=ROOT_CA_PATH,
            certfile=CERT_PATH,
            keyfile=PRIVATE_KEY_PATH
        )

    def on_connect(self, client, userdata, flags, rc, *extra):
        if rc == 0:
            self.connected = True
            print("Connected to AWS IoT Core")
        else:
            self.connected = False
            print("Failed to connect. rc =", rc)

    def on_disconnect(self, client, userdata, rc, *extra):
        self.connected = False
        print("Disconnected from AWS IoT Core. rc =", rc)

    def connect(self):
        result = self.client.connect(
            AWS_IOT_ENDPOINT,
            AWS_IOT_PORT,
            keepalive=60
        )

        print("connect() result =", result)

        self.client.loop_start()

        # 等待真正連上，不要一 connect 就馬上 publish
        for _ in range(50):
            if self.connected:
                return
            time.sleep(0.1)

        raise RuntimeError("MQTT connection timeout")

    def publish_imu(self, payload):
        if not self.connected:
            print("Publish skipped: MQTT is not connected")
            return

        message = json.dumps(payload)

        result = self.client.publish(
            MQTT_TOPIC_IMU,
            message,
            qos=1
        )

        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print(f"Published to {MQTT_TOPIC_IMU}: {message}")
        else:
            print(
                "Publish failed:",
                result.rc,
                mqtt.error_string(result.rc)
            )
