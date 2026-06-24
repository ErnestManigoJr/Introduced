import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface Post {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  reaction_counts: Record<string, number>;
  comment_count: number;
  author?: { display_name: string; username: string };
}

const REACTIONS = ['heart', 'fire', 'laugh', 'wow', 'support'] as const;
const REACTION_EMOJI: Record<string, string> = {
  heart: '♥',
  fire: '🔥',
  laugh: '😂',
  wow: '😮',
  support: '🤝',
};

export default function NestScreen() {
  const { appUser } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*, author:app_users!author_id(display_name, username)')
      .eq('visibility', 'public')
      .is('reply_to', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) setPosts(data as Post[]);
  }

  useEffect(() => {
    fetchPosts().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, []);

  async function submitPost() {
    if (!newPost.trim() || !appUser?.id) return;
    setPosting(true);
    const { error } = await supabase.from('posts').insert({
      author_id: appUser.id,
      body: newPost.trim(),
      visibility: 'public',
    });
    if (error) {
      Alert.alert('Error', 'Could not post. Try again.');
    } else {
      setNewPost('');
      await fetchPosts();
    }
    setPosting(false);
  }

  async function react(postId: string, type: string) {
    if (!appUser?.id) return;
    await supabase.from('post_reactions').upsert(
      { user_id: appUser.id, post_id: postId, type },
      { onConflict: 'user_id,post_id' }
    );
    await fetchPosts();
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Nest</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blush[500]} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <PostCard post={item} onReact={react} />
          )}
        />

        {/* Compose bar */}
        <View style={styles.compose}>
          <TextInput
            style={styles.composeInput}
            placeholder="Share something with the Nest..."
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
            {posting ? (
              <ActivityIndicator size="small" color={Colors.ivory} />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PostCard({ post, onReact }: { post: Post; onReact: (id: string, type: string) => void }) {
  const author = post.author as any;
  const timeAgo = getTimeAgo(post.created_at);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {author?.display_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.authorName}>{author?.display_name ?? 'Unknown'}</Text>
          <Text style={styles.cardTime}>@{author?.username ?? '...'} · {timeAgo}</Text>
        </View>
      </View>

      <Text style={styles.cardBody}>{post.body}</Text>

      <View style={styles.reactions}>
        {REACTIONS.map((type) => {
          const count = post.reaction_counts?.[type] ?? 0;
          return (
            <Pressable key={type} onPress={() => onReact(post.id, type)} style={styles.reactionBtn}>
              <Text style={styles.reactionEmoji}>{REACTION_EMOJI[type]}</Text>
              {count > 0 && <Text style={styles.reactionCount}>{count}</Text>}
            </Pressable>
          );
        })}
        {post.comment_count > 0 && (
          <Text style={styles.commentCount}>💬 {post.comment_count}</Text>
        )}
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>⌂</Text>
      <Text style={styles.emptyTitle}>The Nest is quiet</Text>
      <Text style={styles.emptyBody}>Be the first to share something.</Text>
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
  card: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.plum[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.blush[500],
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: Colors.blush[400] },
  cardMeta: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: '600', color: Colors.ivory },
  cardTime: { fontSize: 12, color: Colors.plum[400], marginTop: 1 },
  cardBody: { fontSize: 15, color: Colors.plum[100], lineHeight: 22, marginBottom: 12 },
  reactions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { fontSize: 12, color: Colors.plum[300] },
  commentCount: { fontSize: 13, color: Colors.plum[300], marginLeft: 4 },
  compose: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.plum[800],
    backgroundColor: Theme.background,
    gap: 10,
  },
  composeInput: {
    flex: 1,
    backgroundColor: Colors.plum[800],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.ivory,
    fontSize: 15,
    maxHeight: 100,
  },
  postBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: Colors.ivory, fontWeight: '600', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 40, color: Colors.plum[600] },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.ivory },
  emptyBody: { fontSize: 14, color: Colors.plum[400] },
});
