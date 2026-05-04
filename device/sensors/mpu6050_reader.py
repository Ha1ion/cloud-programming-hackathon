from smbus2 import SMBus


class MPU6050Reader:
    def __init__(self, bus_id=1, address=0x68):
        self.bus = SMBus(bus_id)
        self.address = address

        # Wake up MPU6050
        self.bus.write_byte_data(self.address, 0x6B, 0)

    def _read_word_2c(self, register):
        high = self.bus.read_byte_data(self.address, register)
        low = self.bus.read_byte_data(self.address, register + 1)

        value = (high << 8) + low

        if value >= 0x8000:
            value = -((65535 - value) + 1)

        return value

    def read(self):
        # Accelerometer raw data
        accel_x_raw = self._read_word_2c(0x3B)
        accel_y_raw = self._read_word_2c(0x3D)
        accel_z_raw = self._read_word_2c(0x3F)

        # Gyroscope raw data
        gyro_x_raw = self._read_word_2c(0x43)
        gyro_y_raw = self._read_word_2c(0x45)
        gyro_z_raw = self._read_word_2c(0x47)

        # Default sensitivity scale:
        # Accelerometer ±2g: 16384 LSB/g
        # Gyroscope ±250 deg/s: 131 LSB/(deg/s)
        accel = {
            "x": accel_x_raw / 16384.0,
            "y": accel_y_raw / 16384.0,
            "z": accel_z_raw / 16384.0
        }

        gyro = {
            "x": gyro_x_raw / 131.0,
            "y": gyro_y_raw / 131.0,
            "z": gyro_z_raw / 131.0
        }

        return {
            "accel": accel,
            "gyro": gyro
        }
