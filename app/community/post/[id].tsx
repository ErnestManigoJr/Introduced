import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Theme, Colors } from '../../../src/constants/colors';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/authStore';

interface Post {
  id: string;
  body: string;
  created_at: string;
  reaction_counts: Record<string, number>;
  comment_count: number;
  author: { display_name: string; username: string } | null;
}

const REACTIONS = ['❤️', '🔥', '😂', '😮', '👏'];

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function PostDetailScreen() {
  const { appUser } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    load();

    const channel = supabase
      .channel(`post:${id}:replies`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `reply_to=eq.${id}`,
      }, (payload) => {
        // Re-fetch to get joined author data
        loadReplies();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function load() {
    await Promise.all([loadPost(), loadReplies()]);
    setLoading(false);
  }

  async function loadPost() {
    const { data } = await supabase
      .from('posts')
      .select('id, body, created_at, reaction_counts, comment_count, author:app_users!author_id(display_name, username)')
      .eq('id', id)
      .single();
    if (data) {
      setPost(data as unknown as Post);
      const author = (data as any).author;
      navigation.setOptions({ title: author?.display_name ? `${author.display_name}'s Post` : 'Post' });
    }
  }

  async function loadReplies() {
    const { data } = await supabase
      .from('posts')
      .select('id, body, created_at, reaction_counts, comment_count, author:app_users!author_id(display_name, username)')
      .eq('reply_to', id)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setReplies(data as unknown as Post[]);
  }

  async function react(emoji: string) {
    if (!post || !appUser?.id) return;
    const current = post.reaction_counts ?? {};
    const updated = { ...current, [emoji]: (current[emoji] ?? 0) + 1 };
    await supabase.from('posts').update({ reaction_counts: updated }).eq('id', post.id);
    setPost((p) => p ? { ...p, reaction_counts: updated } : p);
  }

  async function submitReply() {
    if (!reply.trim() || !appUser?.id || !post) return;
    setPosting(true);
    const { error } = await supabase.from('posts').insert({
      author_id: appUser.id,
      body: reply.trim(),
      community_id: (post as any).community_id,
      reply_to: post.id,
      visibility: 'room',
    });
    if (!error) {
      setReply('');
      await loadReplies();
      // Increment comment_count on parent
      await supabase
        .from('posts')
        .update({ comment_count: (post.comment_count ?? 0) + 1 })
        .eq('id', post.id);
      setPost((p) => p ? { ...p, comment_count: (p.comment_count ?? 0) + 1 } : p);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
    } else {
      Alert.alert('Error', 'Could not post reply.');
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

  const author = post?.author as any;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <FlatList
        ref={listRef}
        data={replies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          post ? (
            <View style={styles.originalPost}>
              <View style={styles.postHeader}>
                <View style={styles.postAvatar}>
                  <Text style={styles.postInitial}>{author?.display_name?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View>
                  <Text style={styles.postAuthor}>{author?.display_name ?? 'Unknown'}</Text>
                  <Text style={styles.postTime}>@{author?.username ?? '...'} · {getTimeAgo(post.created_at)}</Text>
                </View>
              </View>
              <Text style={styles.postBody}>{post.body}</Text>

              {/* Reactions */}
              <View style={styles.reactionsRow}>
                {REACTIONS.map((emoji) => {
                  const count = post.reaction_counts?.[emoji] ?? 0;
                  return (
                    <Pressable key={emoji} style={[styles.reactionBtn, count > 0 && styles.reactionBtnActive]} onPress={() => react(emoji)}>
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      {count > 0 && <Text style={styles.reactionCount}>{count}</Text>}
                    </Pressable>
                  );
                })}
              </View>

              {replies.length > 0 && (
                <Text style={styles.repliesHeader}>{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</Text>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyReplies}>
            <Text style={styles.emptyRepliesText}>No replies yet. Start the conversation.</Text>
          </View>
        }
        renderItem={({ item }) => <ReplyCard post={item} />}
      />

      <View style={styles.compose}>
        <TextInput
          style={styles.composeInput}
          placeholder="Reply..."
          placeholderTextColor={Colors.plum[400]}
          value={reply}
          onChangeText={setReply}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={submitReply}
          disabled={!reply.trim() || posting}
          style={[styles.postBtn, (!reply.trim() || posting) && styles.postBtnDisabled]}
        >
          {posting
            ? <ActivityIndicator size="small" color={Colors.ivory} />
            : <Text style={styles.postBtnText}>Reply</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function ReplyCard({ post }: { post: Post }) {
  const author = post.author as any;
  return (
    <View style={styles.replyCard}>
      <View style={styles.replyLine} />
      <View style={styles.replyContent}>
        <View style={styles.postHeader}>
          <View style={[styles.postAvatar, styles.replyAvatar]}>
            <Text style={styles.postInitial}>{author?.display_name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View>
            <Text style={styles.postAuthor}>{author?.display_name ?? 'Unknown'}</Text>
            <Text style={styles.postTime}>@{author?.username ?? '...'} · {getTimeAgo(post.created_at)}</Text>
          </View>
        </View>
        <Text style={styles.replyBody}>{post.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 16 },
  originalPost: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[700],
    gap: 10,
    marginBottom: 4,
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
  postBody: { fontSize: 16, color: Colors.ivory, lineHeight: 24 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.plum[800],
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  reactionBtnActive: { borderColor: Colors.blush[500] },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { fontSize: 12, color: Colors.ivory, fontWeight: '600' },
  repliesHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.plum[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  emptyReplies: { paddingVertical: 40, alignItems: 'center' },
  emptyRepliesText: { fontSize: 14, color: Colors.plum[500] },
  replyCard: {
    flexDirection: 'row',
    paddingLeft: 20,
    paddingRight: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
  },
  replyLine: {
    width: 2,
    backgroundColor: Colors.plum[700],
    borderRadius: 1,
    marginRight: 12,
    marginTop: 4,
  },
  replyContent: { flex: 1, gap: 6 },
  replyAvatar: { width: 30, height: 30, borderRadius: 15 },
  replyBody: { fontSize: 14, color: Colors.plum[100], lineHeight: 20 },
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
