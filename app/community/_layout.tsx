import { Stack } from 'expo-router';
import { Colors, Theme } from '../../src/constants/colors';

export default function CommunityLayout() {
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
      <Stack.Screen name="[id]" options={{ title: 'Community' }} />
      <Stack.Screen name="create" options={{ title: 'Create Community' }} />
    </Stack>
  );
}
