import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface PrefRow {
  key: string;
  label: string;
  sub: string;
}

const PREFS: PrefRow[] = [
  { key: 'new_intro',      label: 'New Introductions',    sub: 'When someone introduces you to another person' },
  { key: 'intro_accepted', label: 'Introduction Accepted', sub: 'When someone accepts your introduction' },
  { key: 'both_connected', label: 'Both Connected',        sub: "When both parties accept and you're connected" },
  { key: 'new_message',    label: 'New Messages',          sub: 'Direct messages in your conversations' },
  { key: 'room_invite',    label: 'Intro Room Invites',    sub: 'When someone invites you to a room' },
  { key: 'community_post', label: 'Community Posts',       sub: "New posts in communities you've joined" },
];

const DEFAULT_PREFS: Record<string, boolean> = Object.fromEntries(PREFS.map((p) => [p.key, true]));

// account_settings has notification_push (master push toggle) and notification_email.
// Per-type prefs are stored as a JSON blob in a separate column if available,
// otherwise they derive from the master push toggle.
export default function NotificationsScreen() {
  const { appUser } = useAuthStore();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const [masterPush, setMasterPush] = useState(true);
  const [masterEmail, setMasterEmail] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!appUser?.id) return;
    loadPrefs();
  }, [appUser?.id]);

  async function loadPrefs() {
    if (!appUser?.id) return;
    const { data } = await supabase
      .from('account_settings')
      .select('notification_push, notification_email')
      .eq('user_id', appUser.id)
      .maybeSingle();

    if (data) {
      setMasterPush(data.notification_push ?? true);
      setMasterEmail(data.notification_email ?? true);
      // Derive per-type prefs from master push toggle
      const derived = Object.fromEntries(PREFS.map((p) => [p.key, data.notification_push ?? true]));
      setPrefs(derived);
    }
    setLoading(false);
  }

  function scheduleSave(updatedMasterPush: boolean, updatedMasterEmail: boolean) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(updatedMasterPush, updatedMasterEmail), 600);
  }

  async function persist(pushEnabled: boolean, emailEnabled: boolean) {
    if (!appUser?.id) return;
    setSaving(true);
    await supabase
      .from('account_settings')
      .upsert(
        {
          user_id: appUser.id,
          notification_push: pushEnabled,
          notification_email: emailEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    setSaving(false);
  }

  function togglePref(key: string, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    // If any per-type pref is turned on, master push should be on
    // If all per-type prefs are off, master push turns off
    const anyOn = Object.values(updated).some(Boolean);
    if (anyOn !== masterPush) {
      setMasterPush(anyOn);
      scheduleSave(anyOn, masterEmail);
    } else {
      scheduleSave(masterPush, masterEmail);
    }
  }

  function toggleMasterPush(value: boolean) {
    setMasterPush(value);
    // Sync all per-type prefs to master
    setPrefs(Object.fromEntries(PREFS.map((p) => [p.key, value])));
    scheduleSave(value, masterEmail);
  }

  function toggleMasterEmail(value: boolean) {
    setMasterEmail(value);
    scheduleSave(masterPush, value);
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

      {/* Master toggles */}
      <Text style={styles.sectionHeader}>Master Controls</Text>
      <View style={styles.card}>
        <PrefRow
          label="Push Notifications"
          sub="Enable or disable all push notifications"
          value={masterPush}
          onValueChange={toggleMasterPush}
          isLast={false}
        />
        <PrefRow
          label="Email Notifications"
          sub="Receive notification digests by email"
          value={masterEmail}
          onValueChange={toggleMasterEmail}
          isLast
        />
      </View>

      {/* Per-type push prefs */}
      <Text style={styles.sectionHeader}>Push Notification Types</Text>
      <View style={[styles.card, !masterPush && styles.cardDisabled]}>
        {PREFS.map((pref, index) => (
          <PrefRow
            key={pref.key}
            label={pref.label}
            sub={pref.sub}
            value={prefs[pref.key] && masterPush}
            onValueChange={(v) => togglePref(pref.key, v)}
            isLast={index === PREFS.length - 1}
            disabled={!masterPush}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {saving ? (
          <ActivityIndicator size="small" color={Colors.plum[500]} />
        ) : (
          <Text style={styles.note}>
            Changes save automatically. Push permissions must be enabled in your device settings.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function PrefRow({
  label, sub, value, onValueChange, isLast, disabled,
}: {
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: Colors.plum[700], true: Colors.blush[500] }}
        thumbColor={Colors.ivory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, gap: 12, paddingBottom: 40, backgroundColor: Theme.background },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.plum[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    marginTop: 8,
  },
  card: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  cardDisabled: { opacity: 0.5 },
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
  rowLabelDisabled: { color: Colors.plum[500] },
  rowSub: { fontSize: 12, color: Colors.plum[400], marginTop: 2 },
  footer: { alignItems: 'center', marginTop: 8, minHeight: 24 },
  note: { fontSize: 12, color: Colors.plum[500], lineHeight: 18, textAlign: 'center' },
});
