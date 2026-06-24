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

interface Conversation {
  id: string;
  updated_at: string;
  last_message: string | null;
  unread_count: number;
  other_user: { id: string; display_name: string; username: string } | null;
}

export default function MessagesScreen() {
  const { appUser } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchConversations() {
    if (!appUser?.id) return;

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, updated_at, last_message, unread_count,
        participant_a:app_users!participant_a_id(id, display_name, username),
        participant_b:app_users!participant_b_id(id, display_name, username)
      `)
      .or(`participant_a_id.eq.${appUser.id},participant_b_id.eq.${appUser.id}`)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      const mapped = data.map((c: any) => {
        const isA = c.participant_a?.id === appUser.id;
        return {
          id: c.id,
          updated_at: c.updated_at,
          last_message: c.last_message,
          unread_count: c.unread_count ?? 0,
          other_user: isA ? c.participant_b : c.participant_a,
        };
      });
      setConversations(mapped);
    }
  }

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));
  }, [appUser?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
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
        data={conversations}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blush[500]} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => <ConversationRow conversation={item} />}
      />
    </SafeAreaView>
  );
}

function ConversationRow({ conversation }: { conversation: Conversation }) {
  const other = conversation.other_user as any;
  const timeAgo = getTimeAgo(conversation.updated_at);
  const hasUnread = conversation.unread_count > 0;

  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(`/conversation/${conversation.id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {other?.display_name?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.nameText, hasUnread && styles.nameUnread]}>
            {other?.display_name ?? 'Unknown'}
          </Text>
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[styles.previewText, hasUnread && styles.previewUnread]}
            numberOfLines={1}
          >
            {conversation.last_message ?? 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conversation.unread_count}</Text>
            </View>
          )}
        </View>
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.plum[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.blush[500],
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.blush[400] },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  nameText: { fontSize: 15, fontWeight: '500', color: Colors.plum[300] },
  nameUnread: { fontWeight: '700', color: Colors.ivory },
  timeText: { fontSize: 12, color: Colors.plum[500] },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewText: { fontSize: 14, color: Colors.plum[400], flex: 1 },
  previewUnread: { color: Colors.plum[200] },
  badge: {
    backgroundColor: Colors.blush[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  badgeText: { color: Colors.ivory, fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, color: Colors.plum[600] },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.ivory },
  emptyBody: { fontSize: 14, color: Colors.plum[400], textAlign: 'center', lineHeight: 22 },
});
