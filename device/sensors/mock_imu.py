import random

class MockIMU:
    def read(self):
        return {
            "accel": {
                "x": random.uniform(-0.2, 0.2),
                "y": random.uniform(-0.2, 0.2),
                "z": random.uniform(0.8, 1.2)
            },
            "gyro": {
                "x": random.uniform(-10, 10),
                "y": random.uniform(-10, 10),
                "z": random.uniform(-10, 10)
            }
        }
