import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors, Theme } from '../../src/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Theme.background,
          borderTopColor: Colors.plum[800],
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.blush[500],
        tabBarInactiveTintColor: Colors.plum[400],
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="nest"
        options={{ title: 'Nest', tabBarIcon: ({ color }) => <TabIcon label="⌂" color={color} /> }}
      />
      <Tabs.Screen
        name="rooms"
        options={{ title: 'Rooms', tabBarIcon: ({ color }) => <TabIcon label="◉" color={color} /> }}
      />
      <Tabs.Screen
        name="introduce"
        options={{ title: 'Introduce', tabBarIcon: ({ color }) => <TabIcon label="✦" color={color} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ color }) => <TabIcon label="✉" color={color} /> }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: 'Me', tabBarIcon: ({ color }) => <TabIcon label="◎" color={color} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 18, color }}>{label}</Text>;
}
