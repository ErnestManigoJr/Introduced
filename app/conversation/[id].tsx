import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface OtherUser {
  id: string;
  display_name: string;
  username: string;
}

export default function ConversationScreen() {
  const { appUser } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    loadThread();

    // Realtime subscription for new messages
    const channel = supabase
      .channel(`thread:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `thread_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function loadThread() {
    if (!id || !appUser?.id) return;

    // Fetch thread to find other participant
    const { data: thread } = await supabase
      .from('direct_threads')
      .select('id, participant_ids')
      .eq('id', id)
      .single();

    if (thread) {
      const otherId = thread.participant_ids.find((pid: string) => pid !== appUser.id);
      if (otherId) {
        const { data: user } = await supabase
          .from('app_users')
          .select('id, display_name, username')
          .eq('id', otherId)
          .single();
        if (user) {
          setOtherUser(user as OtherUser);
          navigation.setOptions({ title: user.display_name });
        }
      }
    }

    // Fetch messages
    const { data: msgs } = await supabase
      .from('direct_messages')
      .select('id, thread_id, sender_id, body, is_read, created_at')
      .eq('thread_id', id)
      .order('created_at', { ascending: true });

    if (msgs) setMessages(msgs as Message[]);

    // Mark messages as read
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('thread_id', id)
      .neq('sender_id', appUser.id)
      .eq('is_read', false);

    setLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
  }

  async function sendMessage() {
    if (!text.trim() || !appUser?.id || !id || sending) return;
    setSending(true);

    const body = text.trim();
    setText('');

    await supabase.from('direct_messages').insert({
      thread_id: id,
      sender_id: appUser.id,
      body,
      is_read: false,
    });

    // Update last_message_at on the thread
    await supabase
      .from('direct_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', id);

    setSending(false);
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatIcon}>✦</Text>
              <Text style={styles.emptyChatTitle}>Say hello</Text>
              <Text style={styles.emptyChatBody}>
                You've been introduced to {otherUser?.display_name ?? 'this person'}. Start the conversation.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMine={item.sender_id === appUser?.id}
            />
          )}
        />

        <View style={styles.compose}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={Colors.plum[400]}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <Pressable
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.ivory} />
            ) : (
              <Text style={styles.sendBtnText}>↑</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const time = formatTime(message.created_at);
  return (
    <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{message.body}</Text>
      </View>
      <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{time}</Text>
    </View>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.background },
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingVertical: 12, gap: 2 },
  emptyChat: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyChatIcon: { fontSize: 36, color: Colors.plum[600] },
  emptyChatTitle: { fontSize: 18, fontWeight: '700', color: Colors.ivory },
  emptyChatBody: { fontSize: 14, color: Colors.plum[400], textAlign: 'center', lineHeight: 22 },
  bubbleRow: { marginVertical: 3, alignItems: 'flex-start' },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.plum[800],
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  bubbleMine: {
    backgroundColor: Colors.blush[500],
    borderColor: Colors.blush[500],
  },
  bubbleText: { fontSize: 15, color: Colors.plum[100], lineHeight: 21 },
  bubbleTextMine: { color: Colors.ivory },
  bubbleTime: { fontSize: 11, color: Colors.plum[500], marginTop: 3, marginHorizontal: 4 },
  bubbleTimeMine: { color: Colors.plum[400] },
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
  input: {
    flex: 1,
    backgroundColor: Colors.plum[800],
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.ivory,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.blush[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: Colors.ivory, fontSize: 18, fontWeight: '700' },
});
