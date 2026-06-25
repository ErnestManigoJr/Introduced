import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

const RELATIONSHIP_OPTIONS = [
  { value: 'friendship', label: 'Friendship' },
  { value: 'dating', label: 'Dating' },
  { value: 'both', label: 'Both' },
];

export default function EditProfileScreen() {
  const { appUser, setAppUser } = useAuthStore();

  const [displayName, setDisplayName] = useState(appUser?.display_name ?? '');
  const [username, setUsername] = useState(appUser?.username ?? '');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [intention, setIntention] = useState<string>('friendship');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    if (!appUser?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('bio, city, relationship_intention')
      .eq('user_id', appUser.id)
      .single();

    if (data) {
      setBio(data.bio ?? '');
      setCity(data.city ?? '');
      setIntention(data.relationship_intention ?? 'friendship');
    }
    setLoading(false);
  }

  async function save() {
    if (!appUser?.id) return;
    setUsernameError('');

    const trimmedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (trimmedUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      return;
    }

    setSaving(true);

    // Check username uniqueness (skip if unchanged)
    if (trimmedUsername !== appUser.username) {
      const { data: existing } = await supabase
        .from('app_users')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', appUser.id)
        .single();
      if (existing) {
        setUsernameError('That username is already taken.');
        setSaving(false);
        return;
      }
    }

    const [{ error: userError }, { error: profileError }] = await Promise.all([
      supabase
        .from('app_users')
        .update({ display_name: displayName.trim(), username: trimmedUsername })
        .eq('id', appUser.id),
      supabase
        .from('profiles')
        .upsert({
          user_id: appUser.id,
          bio: bio.trim() || null,
          city: city.trim() || null,
          relationship_intention: intention as any,
        }, { onConflict: 'user_id' }),
    ]);

    if (userError || profileError) {
      Alert.alert('Error', 'Could not save changes. Please try again.');
      setSaving(false);
      return;
    }

    // Refresh auth store
    const { data: updated } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', appUser.id)
      .single();
    if (updated) setAppUser(updated as any);

    setSaving(false);
    router.back();
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
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Field label="Display Name">
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={Colors.plum[500]}
            maxLength={50}
          />
        </Field>

        <Field label="Username" hint={usernameError || 'Letters, numbers, underscores only'} error={!!usernameError}>
          <View style={styles.inputRow}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              value={username}
              onChangeText={(v) => { setUsername(v); setUsernameError(''); }}
              placeholder="username"
              placeholderTextColor={Colors.plum[500]}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
          </View>
        </Field>

        <Field label="Bio" hint={`${bio.length}/200`}>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={bio}
            onChangeText={setBio}
            placeholder="A little about you..."
            placeholderTextColor={Colors.plum[500]}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
        </Field>

        <Field label="City">
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Where are you based?"
            placeholderTextColor={Colors.plum[500]}
            maxLength={80}
          />
        </Field>

        <Field label="I'm open to">
          <View style={styles.optionRow}>
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.option, intention === opt.value && styles.optionActive]}
                onPress={() => setIntention(opt.value)}
              >
                <Text style={[styles.optionText, intention === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        {/* Dating preferences link */}
        <Pressable style={styles.connectorLink} onPress={() => router.push('/profile/dating-preferences')}>
          <View>
            <Text style={styles.connectorLinkTitle}>◈ Connection Preferences</Text>
            <Text style={styles.connectorLinkSub}>What you're open to, pace, and non-negotiables</Text>
          </View>
          <Text style={styles.connectorLinkArrow}>→</Text>
        </Pressable>

        {/* Connector profile link */}
        <Pressable style={styles.connectorLink} onPress={() => router.push('/profile/connector-setup')}>
          <View>
            <Text style={styles.connectorLinkTitle}>✦ Set Up Connector Profile</Text>
            <Text style={styles.connectorLinkSub}>Add a public matchmaker profile and sponsorship</Text>
          </View>
          <Text style={styles.connectorLinkArrow}>→</Text>
        </Pressable>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={Colors.ivory} />
            : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint && <Text style={[styles.fieldHint, error && styles.fieldHintError]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.plum[300], textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldHint: { fontSize: 12, color: Colors.plum[500] },
  fieldHintError: { color: '#e74c3c' },
  input: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    color: Colors.ivory,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputFlex: { flex: 1, borderWidth: 0, paddingLeft: 0 },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    paddingLeft: 14,
  },
  atSign: { fontSize: 15, color: Colors.plum[400] },
  optionRow: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.plum[800],
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  optionActive: { borderColor: Colors.blush[500], backgroundColor: Colors.plum[700] },
  optionText: { fontSize: 14, color: Colors.plum[400] },
  optionTextActive: { color: Colors.ivory, fontWeight: '600' },
  connectorLink: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.champagne[400],
    marginTop: 4,
  },
  connectorLinkTitle: { fontSize: 15, fontWeight: '600', color: Colors.champagne[400] },
  connectorLinkSub: { fontSize: 12, color: Colors.plum[400], marginTop: 2 },
  connectorLinkArrow: { fontSize: 18, color: Colors.plum[400] },
  saveBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: Colors.ivory, fontWeight: '700', fontSize: 16 },
});
