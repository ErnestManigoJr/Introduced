import { Stack } from 'expo-router';
import { Colors, Theme } from '../../src/constants/colors';

export default function IntroRoomLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Theme.background },
        animation: 'slide_from_bottom',
      }}
    />
  );
}
