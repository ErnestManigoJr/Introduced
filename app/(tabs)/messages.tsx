import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
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

interface PendingIntro {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
  connector: { display_name: string } | null;
  person_a: { id: string; display_name: string } | null;
  person_b: { id: string; display_name: string } | null;
}

export default function MessagesScreen() {
  const { appUser } = useAuthStore();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [pendingIntros, setPendingIntros] = useState<PendingIntro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    if (!appUser?.id) return;
    await Promise.all([fetchThreads(), fetchPendingIntros()]);
  }

  async function fetchThreads() {
    if (!appUser?.id) return;

    const { data: threadData, error } = await supabase
      .from('direct_threads')
      .select('id, participant_ids, last_message_at, created_at')
      .contains('participant_ids', [appUser.id])
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error || !threadData) return;

    const enriched = await Promise.all(
      threadData.map(async (thread) => {
        const otherId = thread.participant_ids.find((id: string) => id !== appUser.id);
        if (!otherId) return { ...thread, other_user: null };

        const { data: user } = await supabase
          .from('app_users')
          .select('id, display_name, username')
          .eq('id', otherId)
          .maybeSingle();

        const { data: lastMsg } = await supabase
          .from('direct_messages')
          .select('body')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return { ...thread, other_user: user ?? null, last_message_body: lastMsg?.body ?? null };
      })
    );

    setThreads(enriched);
  }

  async function fetchPendingIntros() {
    if (!appUser?.id) return;

    // Intros where the current user is person_a or person_b and still needs to respond
    const { data } = await supabase
      .from('introductions')
      .select(`
        id, status, note, created_at,
        connector:app_users!connector_id(display_name),
        person_a:app_users!person_a_id(id, display_name),
        person_b:app_users!person_b_id(id, display_name)
      `)
      .or(`person_a_id.eq.${appUser.id},person_b_id.eq.${appUser.id}`)
      .in('status', ['pending', 'a_accepted', 'b_accepted'])
      .order('created_at', { ascending: false });

    if (!data) return;

    // Filter to only show intros that still need THIS user's response
    const needsResponse = (data as unknown as PendingIntro[]).filter((intro) => {
      const isA = (intro.person_a as any)?.id === appUser.id;
      const isB = (intro.person_b as any)?.id === appUser.id;
      if (isA && (intro.status === 'pending' || intro.status === 'b_accepted')) return true;
      if (isB && (intro.status === 'pending' || intro.status === 'a_accepted')) return true;
      return false;
    });

    setPendingIntros(needsResponse);
  }

  useEffect(() => {
    fetchData().finally(() => setLoading(false));

    // Realtime: refresh when an introduction changes status
    const sub = supabase
      .channel('messages-intros')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'introductions',
        filter: `person_a_id=eq.${appUser?.id}`,
      }, fetchPendingIntros)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'introductions',
        filter: `person_b_id=eq.${appUser?.id}`,
      }, fetchPendingIntros)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [appUser?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
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
        {pendingIntros.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingIntros.length}</Text>
          </View>
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blush[500]} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Pending introductions inbox */}
        {pendingIntros.length > 0 && (
          <View style={styles.inboxSection}>
            <Text style={styles.sectionLabel}>Pending Introductions</Text>
            {pendingIntros.map((intro) => (
              <PendingIntroCard key={intro.id} intro={intro} userId={appUser?.id ?? ''} />
            ))}
          </View>
        )}

        {/* Conversations */}
        {threads.length > 0 && (
          <View style={styles.threadsSection}>
            {pendingIntros.length > 0 && <Text style={styles.sectionLabel}>Conversations</Text>}
            {threads.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} />
            ))}
          </View>
        )}

        {pendingIntros.length === 0 && threads.length === 0 && <EmptyState />}
      </ScrollView>
    </SafeAreaView>
  );
}

function PendingIntroCard({ intro, userId }: { intro: PendingIntro; userId: string }) {
  const connector = intro.connector as any;
  const personA = intro.person_a as any;
  const personB = intro.person_b as any;
  const isA = personA?.id === userId;
  const otherPerson = isA ? personB : personA;

  const waitingOnMe =
    (isA && (intro.status === 'pending' || intro.status === 'b_accepted')) ||
    (!isA && (intro.status === 'pending' || intro.status === 'a_accepted'));

  return (
    <Pressable
      style={styles.introCard}
      onPress={() => router.push(`/introduce/${intro.id}`)}
    >
      <View style={styles.introCardLeft}>
        <View style={styles.introAvatar}>
          <Text style={styles.introAvatarText}>
            {otherPerson?.display_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
      </View>
      <View style={styles.introCardBody}>
        <Text style={styles.introTitle}>
          Meet <Text style={styles.introBold}>{otherPerson?.display_name ?? 'Someone'}</Text>
        </Text>
        <Text style={styles.introSub} numberOfLines={1}>
          Introduced by {connector?.display_name ?? 'someone'}
          {intro.note ? ` · "${intro.note}"` : ''}
        </Text>
        <View style={[styles.introStatusPill, waitingOnMe && styles.introStatusPillActive]}>
          <Text style={[styles.introStatusText, waitingOnMe && styles.introStatusTextActive]}>
            {waitingOnMe ? 'Respond →' : 'Waiting on them'}
          </Text>
        </View>
      </View>
    </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.ivory },
  badge: {
    backgroundColor: Colors.blush[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: Colors.ivory },
  scroll: { paddingBottom: 32 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.plum[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  inboxSection: { borderBottomWidth: 1, borderBottomColor: Colors.plum[800], paddingBottom: 8 },
  threadsSection: {},
  // Pending intro card
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
  },
  introCardLeft: {},
  introAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.plum[700],
    borderWidth: 2, borderColor: Colors.champagne[400],
    alignItems: 'center', justifyContent: 'center',
  },
  introAvatarText: { fontSize: 18, fontWeight: '700', color: Colors.champagne[400] },
  introCardBody: { flex: 1, gap: 3 },
  introTitle: { fontSize: 15, color: Colors.ivory },
  introBold: { fontWeight: '700' },
  introSub: { fontSize: 13, color: Colors.plum[400], lineHeight: 18 },
  introStatusPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.plum[800],
    borderWidth: 1,
    borderColor: Colors.plum[600],
  },
  introStatusPillActive: { borderColor: Colors.blush[500], backgroundColor: 'rgba(226,80,122,0.1)' },
  introStatusText: { fontSize: 12, color: Colors.plum[400], fontWeight: '600' },
  introStatusTextActive: { color: Colors.blush[400] },
  // Thread row
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
