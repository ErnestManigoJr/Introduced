import { Stack } from 'expo-router';
import { Colors, Theme } from '../../src/constants/colors';

export default function IntroduceStackLayout() {
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
      <Stack.Screen name="suggest" options={{ title: 'Choose People' }} />
      <Stack.Screen name="compose" options={{ title: 'Write Introduction' }} />
      <Stack.Screen name="[id]" options={{ title: 'Introduction' }} />
    </Stack>
  );
}
