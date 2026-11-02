import { PushNotificationsService } from '../application/PushNotificationsService';
import { apiPushTokenRepository, apiStaffPushTokenRepository } from '../infrastructure/ApiPushTokenRepository';
import { expoDevicePushTokenProvider } from '../infrastructure/ExpoDevicePushTokenProvider';

export const pushNotificationsService = new PushNotificationsService(
  apiPushTokenRepository,
  expoDevicePushTokenProvider,
);

/** Staff and trainers: their one gym's device token, for chat messages from members. */
export const staffPushNotificationsService = new PushNotificationsService(
  apiStaffPushTokenRepository,
  expoDevicePushTokenProvider,
);
