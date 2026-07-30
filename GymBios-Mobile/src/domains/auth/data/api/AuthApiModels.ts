export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  roles: string[];
  userId: number;
  enabled: boolean;
}

export type CurrentUserResponse = LoginResponse;