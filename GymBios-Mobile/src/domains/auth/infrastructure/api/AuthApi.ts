import { httpClient } from '@/core/platform/api';

import type {
  LoginRequestApiModel,
  LoginResponseApiModel,
  MeResponseApiModel,
  MobileRegisterInitiatedApiModel,
  MobileRegistrationStatusApiModel,
  MobileResendOtpApiModel,
} from './AuthApiModels';

export class AuthApi {
  async login(payload: LoginRequestApiModel) {
    const response = await httpClient.post<LoginResponseApiModel>('/auth/login', payload);
    return response;
  }

  getCurrentUser() {
    return httpClient.get<MeResponseApiModel>('/auth/me');
  }

  async registerMobileUser(payload: any) {
    const response = await httpClient.post<MobileRegisterInitiatedApiModel>('/mobile/auth/register', payload);
    return response;
  }

  async verifyOtp(registrationToken: string, otp: string) {
    const response = await httpClient.post<LoginResponseApiModel>(
      '/mobile/auth/verify-otp',
      { otp },
      { headers: { 'X-Registration-Token': registrationToken } },
    );
    return response;
  }

  async resendOtp(registrationToken: string) {
    const response = await httpClient.post<MobileResendOtpApiModel>(
      '/mobile/auth/resend-otp',
      {},
      { headers: { 'X-Registration-Token': registrationToken } },
    );
    return response;
  }

  async getRegistrationStatus(registrationToken: string) {
    const response = await httpClient.get<MobileRegistrationStatusApiModel>('/mobile/auth/registration-status', {
      headers: { 'X-Registration-Token': registrationToken },
    });
    return response;
  }
}
