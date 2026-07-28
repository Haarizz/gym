import { httpClient } from '@/core/platform/api';

import type { LoginRequestApiModel, LoginResponseApiModel, MeResponseApiModel } from './AuthApiModels';

export class AuthApi {
  login(payload: LoginRequestApiModel) {
    return httpClient.post<LoginResponseApiModel>('/auth/login', payload);
  }

  getCurrentUser() {
    return httpClient.get<MeResponseApiModel>('/auth/me');
  }
}
