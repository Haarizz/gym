import { PushNotificationsService } from '../application/PushNotificationsService';
import { apiPushTokenRepository } from '../infrastructure/ApiPushTokenRepository';
import { expoDevicePushTokenProvider } from '../infrastructure/ExpoDevicePushTokenProvider';

export const pushNotificationsService = new PushNotificationsService(
  apiPushTokenRepository,
  expoDevicePushTokenProvider,
);
