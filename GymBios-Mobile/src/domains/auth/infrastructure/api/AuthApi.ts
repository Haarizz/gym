import { httpClient } from '@/core/platform/api';

import type {
  AppleAuthRequestApiModel,
  GoogleAuthRequestApiModel,
  LinkProviderRequestApiModel,
  LinkProviderResponseApiModel,
  LoginRequestApiModel,
  LoginResponseApiModel,
  MeResponseApiModel,
  MobileRegisterInitiatedApiModel,
  MobileRegistrationStatusApiModel,
  MobileResendOtpApiModel,
  SocialAuthApiModel,
  SocialCompleteRequestApiModel,
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

  async googleAuth(payload: GoogleAuthRequestApiModel) {
    const response = await httpClient.post<SocialAuthApiModel>('/mobile/auth/google', payload);
    return response;
  }

  async completeGoogleRegistration(pendingToken: string, payload: SocialCompleteRequestApiModel) {
    const response = await httpClient.post<LoginResponseApiModel>(
      '/mobile/auth/google/complete',
      payload,
      { headers: { 'X-Social-Registration-Token': pendingToken } },
    );
    return response;
  }

  async appleAuth(payload: AppleAuthRequestApiModel) {
    const response = await httpClient.post<SocialAuthApiModel>('/mobile/auth/apple', payload);
    return response;
  }

  async completeAppleRegistration(pendingToken: string, payload: SocialCompleteRequestApiModel) {
    const response = await httpClient.post<LoginResponseApiModel>(
      '/mobile/auth/apple/complete',
      payload,
      { headers: { 'X-Social-Registration-Token': pendingToken } },
    );
    return response;
  }

  async linkProvider(provider: 'GOOGLE' | 'APPLE', payload: LinkProviderRequestApiModel) {
    const response = await httpClient.post<LinkProviderResponseApiModel>(
      `/mobile/auth/${provider.toLowerCase()}/link`,
      payload,
    );
    return response;
  }
}
