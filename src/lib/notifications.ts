import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and get the Expo push token.
 * Saves the token to the user's app_users row for server-side delivery.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Push] Push notifications only work on physical devices.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Push notification permission denied.');
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Introduced',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e2507a',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Save token to Supabase so the server can send notifications
    await supabase
      .from('app_users')
      .update({ push_token: token, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return token;
  } catch (err) {
    console.error('[Push] Failed to get push token:', err);
    return null;
  }
}

/**
 * Clear badge count (call when user opens the app or a notification screen)
 */
export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Set up notification tap handler — call once at app root.
 * Returns a cleanup function to call on unmount.
 */
export function setupNotificationListeners(
  onNotificationTap: (data: Record<string, any>) => void
) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, any>;
    onNotificationTap(data);
  });

  return () => subscription.remove();
}
