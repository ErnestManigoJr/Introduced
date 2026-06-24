import { Stack } from 'expo-router';
import { Colors, Theme } from '../../src/constants/colors';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Theme.background },
        headerTintColor: Colors.ivory,
        headerTitleStyle: { fontWeight: '600', color: Colors.ivory },
        headerBackTitle: '',
        contentStyle: { backgroundColor: Theme.background },
      }}
    >
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="help" options={{ title: 'Help & Feedback' }} />
    </Stack>
  );
}
