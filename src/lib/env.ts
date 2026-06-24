export const ENV = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  livekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL ?? '',
  appName: process.env.EXPO_PUBLIC_APP_NAME ?? 'Introduced',
  appScheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? 'introduced',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  appleServiceId: process.env.EXPO_PUBLIC_APPLE_SERVICE_ID ?? '',
};
