import { Stack } from 'expo-router';
import { Colors, Theme } from '../../src/constants/colors';

export default function ProfileLayout() {
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
      <Stack.Screen name="edit" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="connector-setup" options={{ title: 'Connector Profile' }} />
      <Stack.Screen name="connection-style" options={{ title: 'Connection Style' }} />
      <Stack.Screen name="dating-preferences" options={{ title: 'Connection Preferences' }} />
    </Stack>
  );
}
