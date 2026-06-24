import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Theme, Colors } from '../../src/constants/colors';

interface PrefRow {
  key: string;
  label: string;
  sub: string;
}

const PREFS: PrefRow[] = [
  { key: 'new_intro', label: 'New Introductions', sub: 'When someone introduces you to another person' },
  { key: 'intro_accepted', label: 'Introduction Accepted', sub: 'When someone accepts your introduction' },
  { key: 'both_connected', label: 'Both Connected', sub: 'When both parties accept and you\'re connected' },
  { key: 'new_message', label: 'New Messages', sub: 'Direct messages in your conversations' },
  { key: 'room_invite', label: 'Intro Room Invites', sub: 'When someone invites you to a room' },
  { key: 'community_post', label: 'Community Posts', sub: 'New posts in communities you\'ve joined' },
];

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(PREFS.map((p) => [p.key, true]))
  );

  function toggle(key: string, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    // In production: persist to Supabase user_notification_prefs table
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.sectionHeader}>Push Notifications</Text>
      <View style={styles.card}>
        {PREFS.map((pref, index) => (
          <View key={pref.key} style={[styles.row, index < PREFS.length - 1 && styles.rowBorder]}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{pref.label}</Text>
              <Text style={styles.rowSub}>{pref.sub}</Text>
            </View>
            <Switch
              value={prefs[pref.key]}
              onValueChange={(v) => toggle(pref.key, v)}
              trackColor={{ false: Colors.plum[700], true: Colors.blush[500] }}
              thumbColor={Colors.ivory}
            />
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Notification delivery requires push permissions to be enabled in your device settings.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
});
