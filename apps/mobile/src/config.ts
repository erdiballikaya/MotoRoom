import { Platform } from 'react-native';

const fallbackApiUrl = Platform.select({
  android: 'http://10.0.2.2:4000',
  ios: 'http://127.0.0.1:4000',
  default: 'http://localhost:4000'
});

const readEnv = (value: string | undefined) => value?.trim() || undefined;

export const appConfig = {
  apiBaseUrl: readEnv(process.env.EXPO_PUBLIC_API_URL) ?? fallbackApiUrl ?? 'http://localhost:4000',
  googleClientId: readEnv(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID),
  googleIosClientId: readEnv(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
  googleAndroidClientId: readEnv(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
  googleWebClientId: readEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)
};

export const googleAuthClientIds = {
  ios: appConfig.googleIosClientId ?? appConfig.googleClientId,
  android: appConfig.googleAndroidClientId ?? appConfig.googleClientId,
  web: appConfig.googleWebClientId ?? appConfig.googleClientId
};

export const isGoogleAuthConfigured = Boolean(
  Platform.select({
    ios: googleAuthClientIds.ios,
    android: googleAuthClientIds.android,
    default: googleAuthClientIds.web
  })
);
