import Constants from 'expo-constants';

export type AppEnvironment = 'development' | 'staging' | 'production';

export interface EnvConfig {
  apiBaseUrl: string;
  environment: AppEnvironment;
  appVersion: string;
  useMockApi: boolean;
  /** Public, non-secret Google OAuth client IDs — see .env for why these are safe here. */
  googleWebClientId: string;
  googleIosClientId: string;
}

function resolveEnvironment(): AppEnvironment {
  const env = process.env.EXPO_PUBLIC_APP_ENV;

  if (env === 'staging' || env === 'production') {
    return env;
  }

  return 'development';
}

export const env: EnvConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api',
  environment: resolveEnvironment(),
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
  useMockApi: process.env.EXPO_PUBLIC_USE_MOCK_API === 'true',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
};
