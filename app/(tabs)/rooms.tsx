import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface Room {
  id: string;
  title: string;
  description: string | null;
  status: string;
  participant_count: number;
  created_at: string;
  host: { display_name: string; username: string } | null;
}

export default function RoomsScreen() {
  const { appUser } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchRooms() {
    const { data, error } = await supabase
      .from('rooms')
      .select('*, host:app_users!host_id(display_name, username)')
      .in('status', ['waiting', 'live'])
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && data) setRooms(data as Room[]);
  }

  useEffect(() => {
    fetchRooms().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  }, []);

  async function createRoom() {
    if (!appUser?.id) return;
    Alert.alert(
      'Start an Intro Room',
      'Intro Rooms let you have a live voice/video conversation with someone you\'ve been introduced to.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Room',
          onPress: async () => {
            const { data, error } = await supabase
              .from('rooms')
              .insert({ host_id: appUser.id, title: `${appUser.display_name}'s Room`, status: 'waiting' })
              .select()
              .single();
            if (error) {
              Alert.alert('Error', 'Could not create room.');
            } else if (data) {
              router.push(`/intro-room/${data.id}`);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blush[500]} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Intro Rooms</Text>
        <Pressable onPress={createRoom} style={styles.createBtn}>
          <Text style={styles.createBtnText}>+ Room</Text>
        </Pressable>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blush[500]} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState onCreate={createRoom} />}
        renderItem={({ item }) => <RoomCard room={item} />}
      />
    </SafeAreaView>
  );
}

function RoomCard({ room }: { room: Room }) {
  const host = room.host as any;
  const isLive = room.status === 'live';

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/intro-room/${room.id}`)}
    >
      <View style={styles.cardTop}>
        <View style={[styles.statusDot, isLive ? styles.statusLive : styles.statusWaiting]} />
        <Text style={styles.statusLabel}>{isLive ? 'LIVE' : 'WAITING'}</Text>
        <Text style={styles.participantCount}>◉ {room.participant_count ?? 0}</Text>
      </View>
      <Text style={styles.roomTitle}>{room.title}</Text>
      {room.description && <Text style={styles.roomDesc}>{room.description}</Text>}
      {host && (
        <Text style={styles.hostLabel}>Hosted by {host.display_name}</Text>
      )}
      <View style={styles.joinBtn}>
        <Text style={styles.joinBtnText}>{isLive ? 'Join Room' : 'Enter Room'}</Text>
      </View>
    </Pressable>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>◉</Text>
      <Text style={styles.emptyTitle}>No rooms right now</Text>
      <Text style={styles.emptyBody}>
        Start an Intro Room to have a live conversation with someone you've been introduced to.
      </Text>
      <Pressable onPress={onCreate} style={styles.emptyBtn}>
        <Text style={styles.emptyBtnText}>Start a Room</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.background },
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.ivory },
  createBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  createBtnText: { color: Colors.ivory, fontWeight: '600', fontSize: 13 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLive: { backgroundColor: Colors.blush[500] },
  statusWaiting: { backgroundColor: Colors.champagne[400] },
  statusLabel: { fontSize: 11, fontWeight: '700', color: Colors.plum[400], letterSpacing: 0.5 },
  participantCount: { fontSize: 12, color: Colors.plum[400], marginLeft: 'auto' },
  roomTitle: { fontSize: 17, fontWeight: '700', color: Colors.ivory },
  roomDesc: { fontSize: 14, color: Colors.plum[300], lineHeight: 20 },
  hostLabel: { fontSize: 13, color: Colors.plum[400] },
  joinBtn: {
    marginTop: 8,
    backgroundColor: Colors.plum[700],
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.blush[500],
  },
  joinBtnText: { color: Colors.blush[400], fontWeight: '600', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, color: Colors.plum[600] },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.ivory },
  emptyBody: { fontSize: 14, color: Colors.plum[400], textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: Colors.blush[500],
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: Colors.ivory, fontWeight: '600', fontSize: 15 },
});
