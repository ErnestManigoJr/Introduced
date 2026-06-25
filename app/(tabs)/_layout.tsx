import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { Colors, Theme } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/lib/supabase';
import { useEffect, useState } from 'react';

export default function TabLayout() {
  const { appUser } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!appUser?.id) return;

    async function fetchCount() {
      const { data } = await supabase
        .from('introductions')
        .select('id, status, person_a_id, person_b_id')
        .or(`person_a_id.eq.${appUser!.id},person_b_id.eq.${appUser!.id}`)
        .in('status', ['pending', 'a_accepted', 'b_accepted']);

      if (!data) return;
      const count = data.filter((intro) => {
        const isA = intro.person_a_id === appUser!.id;
        const isB = intro.person_b_id === appUser!.id;
        if (isA && (intro.status === 'pending' || intro.status === 'b_accepted')) return true;
        if (isB && (intro.status === 'pending' || intro.status === 'a_accepted')) return true;
        return false;
      }).length;
      setPendingCount(count);
    }

    fetchCount();

    const sub = supabase
      .channel('tab-intro-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'introductions' }, fetchCount)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [appUser?.id]);

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
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <TabIconBadged label="✉" color={color} count={pendingCount} />,
        }}
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

function TabIconBadged({ label, color, count }: { label: string; color: string; count: number }) {
  const { Text } = require('react-native');
  return (
    <View style={{ position: 'relative' }}>
      <Text style={{ fontSize: 18, color }}>{label}</Text>
      {count > 0 && (
        <View style={{
          position: 'absolute', top: -4, right: -8,
          backgroundColor: Colors.blush[500],
          borderRadius: 8, minWidth: 16, height: 16,
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 3,
        }}>
          <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      )}
    </View>
  );
}
