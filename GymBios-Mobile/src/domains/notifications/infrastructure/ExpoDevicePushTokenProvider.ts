import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { DevicePushTokenProvider } from '../application/DevicePushTokenProvider';

export const expoDevicePushTokenProvider: DevicePushTokenProvider = {
  async getToken({ askPermission }) {
    if ((Platform.OS !== 'ios' && Platform.OS !== 'android') || !Device.isDevice) return null;

    if (Platform.OS === 'android') {
      // Android 13+ only shows the permission prompt once a channel exists.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && askPermission) {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { expoPushToken: data, platform: Platform.OS };
  },
};
