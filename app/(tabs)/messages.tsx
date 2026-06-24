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
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface Thread {
  id: string;
  participant_ids: string[];
  last_message_at: string | null;
  created_at: string;
  last_message_body?: string | null;
  other_user?: { id: string; display_name: string; username: string } | null;
}

export default function MessagesScreen() {
  const { appUser } = useAuthStore();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchThreads() {
    if (!appUser?.id) return;

    // Fetch threads the current user is part of
    const { data: threadData, error } = await supabase
      .from('direct_threads')
      .select('id, participant_ids, last_message_at, created_at')
      .contains('participant_ids', [appUser.id])
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error || !threadData) return;

    // Fetch the other participant's profile for each thread
    const enriched = await Promise.all(
      threadData.map(async (thread) => {
        const otherId = thread.participant_ids.find((id: string) => id !== appUser.id);
        if (!otherId) return { ...thread, other_user: null };

        const { data: user } = await supabase
          .from('app_users')
          .select('id, display_name, username')
          .eq('id', otherId)
          .single();

        // Get last message
        const { data: lastMsg } = await supabase
          .from('direct_messages')
          .select('body')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return { ...thread, other_user: user ?? null, last_message_body: lastMsg?.body ?? null };
      })
    );

    setThreads(enriched);
  }

  useEffect(() => {
    fetchThreads().finally(() => setLoading(false));
  }, [appUser?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchThreads();
    setRefreshing(false);
  }, [appUser?.id]);

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
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blush[500]} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => <ThreadRow thread={item} />}
      />
    </SafeAreaView>
  );
}

function ThreadRow({ thread }: { thread: Thread }) {
  const other = thread.other_user;
  const timeAgo = thread.last_message_at ? getTimeAgo(thread.last_message_at) : '';

  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(`/conversation/${thread.id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {other?.display_name?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.nameText}>{other?.display_name ?? 'Unknown'}</Text>
          {timeAgo ? <Text style={styles.timeText}>{timeAgo}</Text> : null}
        </View>
        <Text style={styles.previewText} numberOfLines={1}>
          {thread.last_message_body ?? 'No messages yet'}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>✉</Text>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptyBody}>
        When you're introduced to someone and both accept, a conversation will open here.
      </Text>
    </View>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.ivory },
  list: { paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
    gap: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.plum[700],
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.blush[500],
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.blush[400] },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  nameText: { fontSize: 15, fontWeight: '600', color: Colors.ivory },
  timeText: { fontSize: 12, color: Colors.plum[500] },
  previewText: { fontSize: 14, color: Colors.plum[400] },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, color: Colors.plum[600] },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.ivory },
  emptyBody: { fontSize: 14, color: Colors.plum[400], textAlign: 'center', lineHeight: 22 },
});
