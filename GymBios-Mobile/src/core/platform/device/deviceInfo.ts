import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const deviceInfo = {
  get platform() {
    return Platform.OS;
  },

  get isDevice() {
    return Device.isDevice;
  },

  get deviceName() {
    return Device.deviceName;
  },
};
