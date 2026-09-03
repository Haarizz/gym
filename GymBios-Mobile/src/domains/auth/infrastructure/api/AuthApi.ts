import { httpClient } from '@/core/platform/api';

import type { LoginRequestApiModel, LoginResponseApiModel, MeResponseApiModel } from './AuthApiModels';

export class AuthApi {
  async login(payload: LoginRequestApiModel) {
    const response = await httpClient.post<LoginResponseApiModel>('/auth/login', payload);
    return response;
  }

  getCurrentUser() {
    return httpClient.get<MeResponseApiModel>('/auth/me');
  }
}
