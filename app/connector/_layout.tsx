import { Stack } from 'expo-router';
import { Colors, Theme } from '../../src/constants/colors';

export default function ConnectorLayout() {
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
      <Stack.Screen name="[userId]" options={{ title: 'Connector' }} />
      <Stack.Screen name="leaderboard" options={{ title: 'Top Connectors' }} />
    </Stack>
  );
}
