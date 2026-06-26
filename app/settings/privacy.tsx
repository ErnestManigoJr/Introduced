import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface BlockedUser {
  id: string;
  blocked_id: string;
  blocked_user: { display_name: string; username: string } | null;
}

export default function PrivacyScreen() {
  const { appUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [openToIntros, setOpenToIntros] = useState(true);
  const [showInSearch, setShowInSearch] = useState(true);
  const [showConnectionCount, setShowConnectionCount] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    if (!appUser?.id) return;
    const [profileRes, blocksRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('open_to_introductions, show_in_search, show_connection_count')
        .eq('user_id', appUser.id)
        .single(),
      supabase
        .from('blocks')
        .select('id, blocked_id, blocked_user:app_users!blocked_id(display_name, username)')
        .eq('blocker_id', appUser.id),
    ]);

    if (profileRes.data) {
      setOpenToIntros(profileRes.data.open_to_introductions ?? true);
      setShowInSearch(profileRes.data.show_in_search ?? true);
      setShowConnectionCount(profileRes.data.show_connection_count ?? true);
    }
    setBlockedUsers((blocksRes.data as unknown as BlockedUser[]) ?? []);
    setLoading(false);
  }

  async function unblock(blockId: string, displayName: string) {
    Alert.alert('Unblock', `Unblock ${displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          const { error } = await supabase.from('blocks').delete().eq('id', blockId);
          if (error) {
            Alert.alert('Error', 'Could not unblock user.');
          } else {
            setBlockedUsers((prev) => prev.filter((b) => b.id !== blockId));
          }
        },
      },
    ]);
  }

  async function update(field: string, value: boolean) {
    if (!appUser?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('user_id', appUser.id);
    if (error) Alert.alert('Error', 'Could not save setting.');
  }

  function toggle(setter: (v: boolean) => void, field: string, value: boolean) {
    setter(value);
    update(field, value);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blush[500]} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.sectionHeader}>Visibility</Text>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Open to Introductions</Text>
            <Text style={styles.rowSub}>Allow others to introduce you to new people</Text>
          </View>
          <Switch
            value={openToIntros}
            onValueChange={(v) => toggle(setOpenToIntros, 'open_to_introductions', v)}
            trackColor={{ false: Colors.plum[700], true: Colors.blush[500] }}
            thumbColor={Colors.ivory}
          />
        </View>
        <View style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Appear in Search</Text>
            <Text style={styles.rowSub}>Let people find you when searching for users</Text>
          </View>
          <Switch
            value={showInSearch}
            onValueChange={(v) => toggle(setShowInSearch, 'show_in_search', v)}
            trackColor={{ false: Colors.plum[700], true: Colors.blush[500] }}
            thumbColor={Colors.ivory}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Show Connection Count</Text>
            <Text style={styles.rowSub}>Display how many connections you have on your profile</Text>
          </View>
          <Switch
            value={showConnectionCount}
            onValueChange={(v) => toggle(setShowConnectionCount, 'show_connection_count', v)}
            trackColor={{ false: Colors.plum[700], true: Colors.blush[500] }}
            thumbColor={Colors.ivory}
          />
        </View>
      </View>

      <Text style={styles.note}>
        Your data is never sold to third parties. Introduced uses it only to facilitate meaningful introductions.
      </Text>

      <Text style={styles.noteHighlight}>
        Note: Your introduction visibility is also controlled by your Dating Preferences. If your intro status is set to "Not Yet", you will not appear in introduction suggestions.
      </Text>

      {/* Blocked Users */}
      <Text style={styles.sectionHeader}>Blocked Users</Text>
      <View style={styles.card}>
        {blockedUsers.length === 0 ? (
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: Colors.plum[500] }]}>No blocked users</Text>
          </View>
        ) : (
          blockedUsers.map((block, index) => {
            const user = block.blocked_user as any;
            return (
              <View key={block.id} style={[styles.row, index < blockedUsers.length - 1 && styles.rowBorder]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{user?.display_name ?? 'Unknown'}</Text>
                  <Text style={styles.rowSub}>@{user?.username ?? '—'}</Text>
                </View>
                <Pressable
                  onPress={() => unblock(block.id, user?.display_name ?? 'this user')}
                  style={styles.unblockBtn}
                >
                  <Text style={styles.unblockBtnText}>Unblock</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.plum[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.plum[700] },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, color: Colors.ivory, fontWeight: '500' },
  rowSub: { fontSize: 12, color: Colors.plum[400], marginTop: 2 },
  note: { fontSize: 12, color: Colors.plum[500], lineHeight: 18, textAlign: 'center', marginTop: 8 },
  noteHighlight: {
    fontSize: 12,
    color: Colors.champagne[400],
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  unblockBtn: {
    backgroundColor: Colors.plum[700],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.blush[500],
  },
  unblockBtnText: { fontSize: 13, color: Colors.blush[400], fontWeight: '600' },
});
