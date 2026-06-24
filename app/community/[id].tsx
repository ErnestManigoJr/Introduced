import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface Community {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  tags: string[];
  community_type: string;
  created_by: string;
}

interface CommunityPost {
  id: string;
  body: string;
  created_at: string;
  reaction_counts: Record<string, number>;
  comment_count: number;
  author: { display_name: string; username: string } | null;
}

export default function CommunityScreen() {
  const { appUser } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadCommunity();
  }, [id]);

  async function loadCommunity() {
    const [{ data: comm }, { data: membership }] = await Promise.all([
      supabase.from('communities').select('*').eq('id', id).single(),
      supabase.from('community_members')
        .select('id')
        .eq('community_id', id)
        .eq('user_id', appUser?.id ?? '')
        .single(),
    ]);

    if (comm) setCommunity(comm as Community);
    setIsMember(!!membership);
    await loadPosts();
    setLoading(false);
  }

  async function loadPosts() {
    const { data } = await supabase
      .from('posts')
      .select('id, body, created_at, reaction_counts, comment_count, author:app_users!author_id(display_name, username)')
      .eq('community_id', id)
      .is('reply_to', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setPosts(data as unknown as CommunityPost[]);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }, [id]);

  async function joinCommunity() {
    if (!appUser?.id || !id) return;
    const { error } = await supabase.from('community_members').insert({
      community_id: id,
      user_id: appUser.id,
      role: 'member',
    });
    if (!error) {
      setIsMember(true);
      await supabase
        .from('communities')
        .update({ member_count: (community?.member_count ?? 0) + 1 })
        .eq('id', id);
    }
  }

  async function submitPost() {
    if (!newPost.trim() || !appUser?.id || !id) return;
    setPosting(true);
    const { error } = await supabase.from('posts').insert({
      author_id: appUser.id,
      body: newPost.trim(),
      community_id: id,
      visibility: 'room',
    });
    if (!error) {
      setNewPost('');
      await loadPosts();
    } else {
      Alert.alert('Error', 'Could not post. Try again.');
    }
    setPosting(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blush[500]} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      {/* Community header */}
      <View style={styles.commHeader}>
        <View>
          <Text style={styles.commName}>{community?.name ?? '—'}</Text>
          {community?.description && (
            <Text style={styles.commDesc} numberOfLines={2}>{community.description}</Text>
          )}
          <Text style={styles.commMeta}>
            {community?.member_count ?? 0} members
            {community?.tags?.length ? ' · ' + community.tags.slice(0, 3).join(' · ') : ''}
          </Text>
        </View>
        {!isMember && (
          <Pressable style={styles.joinBtn} onPress={joinCommunity}>
            <Text style={styles.joinBtnText}>Join</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blush[500]} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◉</Text>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyBody}>Be the first to start a conversation.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/community/post/${item.id}`)}>
            <ForumPost post={item} />
          </Pressable>
        )}
      />

      {isMember && (
        <View style={styles.compose}>
          <TextInput
            style={styles.composeInput}
            placeholder={`Post in ${community?.name ?? 'community'}...`}
            placeholderTextColor={Colors.plum[400]}
            value={newPost}
            onChangeText={setNewPost}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={submitPost}
            disabled={!newPost.trim() || posting}
            style={[styles.postBtn, (!newPost.trim() || posting) && styles.postBtnDisabled]}
          >
            {posting
              ? <ActivityIndicator size="small" color={Colors.ivory} />
              : <Text style={styles.postBtnText}>Post</Text>}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function ForumPost({ post }: { post: CommunityPost }) {
  const author = post.author as any;
  const timeAgo = getTimeAgo(post.created_at);

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postAvatar}>
          <Text style={styles.postInitial}>{author?.display_name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View>
          <Text style={styles.postAuthor}>{author?.display_name ?? 'Unknown'}</Text>
          <Text style={styles.postTime}>@{author?.username ?? '...'} · {timeAgo}</Text>
        </View>
      </View>
      <Text style={styles.postBody}>{post.body}</Text>
      {post.comment_count > 0 && (
        <Text style={styles.commentCount}>💬 {post.comment_count} {post.comment_count === 1 ? 'reply' : 'replies'}</Text>
      )}
    </View>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  commHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  commName: { fontSize: 18, fontWeight: '700', color: Colors.ivory, marginBottom: 4 },
  commDesc: { fontSize: 13, color: Colors.plum[300], lineHeight: 18, marginBottom: 4 },
  commMeta: { fontSize: 12, color: Colors.plum[400] },
  joinBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinBtnText: { color: Colors.ivory, fontWeight: '600', fontSize: 13 },
  list: { paddingBottom: 16 },
  postCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
    gap: 8,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.plum[700],
    borderWidth: 1.5, borderColor: Colors.blush[500],
    alignItems: 'center', justifyContent: 'center',
  },
  postInitial: { fontSize: 14, fontWeight: '700', color: Colors.blush[400] },
  postAuthor: { fontSize: 14, fontWeight: '600', color: Colors.ivory },
  postTime: { fontSize: 11, color: Colors.plum[400] },
  postBody: { fontSize: 15, color: Colors.plum[100], lineHeight: 22 },
  commentCount: { fontSize: 12, color: Colors.plum[400] },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, color: Colors.plum[600] },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.ivory },
  emptyBody: { fontSize: 14, color: Colors.plum[400], textAlign: 'center', lineHeight: 22 },
  compose: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.plum[800],
    backgroundColor: Theme.background,
    gap: 8,
  },
  composeInput: {
    flex: 1,
    backgroundColor: Colors.plum[800],
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.ivory,
    fontSize: 15,
    maxHeight: 100,
  },
  postBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: Colors.ivory, fontWeight: '600', fontSize: 14 },
});
