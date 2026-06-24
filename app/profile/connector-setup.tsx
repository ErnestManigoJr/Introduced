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
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

export default function ConnectorSetupScreen() {
  const { appUser } = useAuthStore();
  const [handle, setHandle] = useState('');
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorUrl, setSponsorUrl] = useState('');
  const [sponsorCta, setSponsorCta] = useState('');
  const [sponsorActive, setSponsorActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [handleError, setHandleError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    if (!appUser?.id) return;
    const { data } = await supabase
      .from('connector_profiles')
      .select('*')
      .eq('user_id', appUser.id)
      .single();

    if (data) {
      setHandle(data.handle ?? '');
      setTagline(data.tagline ?? '');
      setBio(data.bio ?? '');
      setIsPublic(data.is_public ?? true);
      setSponsorName(data.sponsor_name ?? '');
      setSponsorUrl(data.sponsor_url ?? '');
      setSponsorCta(data.sponsor_cta ?? '');
      setSponsorActive(data.sponsor_active ?? false);
    } else {
      // Pre-fill handle from username
      setHandle(appUser.username ?? '');
    }
    setLoading(false);
  }

  async function save() {
    if (!appUser?.id) return;
    setHandleError('');

    const trimmedHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (trimmedHandle.length < 2) {
      setHandleError('Handle must be at least 2 characters.');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('connector_profiles')
      .upsert({
        user_id: appUser.id,
        handle: trimmedHandle,
        tagline: tagline.trim() || null,
        bio: bio.trim() || null,
        is_public: isPublic,
        sponsor_name: sponsorName.trim() || null,
        sponsor_url: sponsorUrl.trim() || null,
        sponsor_cta: sponsorCta.trim() || null,
        sponsor_active: sponsorActive && !!sponsorName.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      if (error.code === '23505') {
        setHandleError('That handle is already taken.');
      } else {
        Alert.alert('Error', 'Could not save. Please try again.');
      }
      setSaving(false);
      return;
    }

    setSaving(false);
    Alert.alert('Saved', 'Your connector profile is live.', [
      { text: 'View Profile', onPress: () => router.push(`/connector/${appUser.id}`) },
      { text: 'Done', onPress: () => router.back() },
    ]);
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

        <View style={styles.introBanner}>
          <Text style={styles.introBannerTitle}>Your Connector Channel</Text>
          <Text style={styles.introBannerBody}>
            A public page that shows your introduction track record. Sponsors can pay to appear on your intro cards.
          </Text>
        </View>

        <Field label="Handle" hint={handleError || 'Your public @handle for this channel'} error={!!handleError}>
          <View style={styles.inputRow}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              value={handle}
              onChangeText={(v) => { setHandle(v); setHandleError(''); }}
              placeholder="yourhandle"
              placeholderTextColor={Colors.plum[500]}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
          </View>
        </Field>

        <Field label="Tagline" hint="One line that describes your matchmaking style">
          <TextInput
            style={styles.input}
            value={tagline}
            onChangeText={setTagline}
            placeholder="E.g. 'I introduce people who build things'"
            placeholderTextColor={Colors.plum[500]}
            maxLength={80}
          />
        </Field>

        <Field label="Bio">
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about how and why you make introductions..."
            placeholderTextColor={Colors.plum[500]}
            multiline
            maxLength={400}
            textAlignVertical="top"
          />
        </Field>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Public profile</Text>
            <Text style={styles.switchSub}>Visible in search and leaderboard</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: Colors.plum[700], true: Colors.blush[500] }}
            thumbColor={Colors.ivory}
          />
        </View>

        {/* Sponsorship section */}
        <View style={styles.sponsorSection}>
          <Text style={styles.sponsorSectionTitle}>Sponsorship</Text>
          <Text style={styles.sponsorSectionSub}>
            A sponsor's name and CTA appear on your intro cards. Sponsors reach your audience every time you make an introduction.
          </Text>

          <Field label="Sponsor Name">
            <TextInput
              style={styles.input}
              value={sponsorName}
              onChangeText={setSponsorName}
              placeholder="E.g. Acme Co"
              placeholderTextColor={Colors.plum[500]}
              maxLength={60}
            />
          </Field>

          <Field label="Sponsor URL">
            <TextInput
              style={styles.input}
              value={sponsorUrl}
              onChangeText={setSponsorUrl}
              placeholder="https://..."
              placeholderTextColor={Colors.plum[500]}
              autoCapitalize="none"
              keyboardType="url"
              maxLength={200}
            />
          </Field>

          <Field label="Call to Action" hint="Short prompt shown on your profile">
            <TextInput
              style={styles.input}
              value={sponsorCta}
              onChangeText={setSponsorCta}
              placeholder="E.g. Try it free"
              placeholderTextColor={Colors.plum[500]}
              maxLength={40}
            />
          </Field>

          {sponsorName.trim().length > 0 && (
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Show sponsor on profile</Text>
                <Text style={styles.switchSub}>Activate the sponsor card</Text>
              </View>
              <Switch
                value={sponsorActive}
                onValueChange={setSponsorActive}
                trackColor={{ false: Colors.plum[700], true: Colors.champagne[400] }}
                thumbColor={Colors.ivory}
              />
            </View>
          )}
        </View>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={Colors.ivory} />
            : <Text style={styles.saveBtnText}>Save Connector Profile</Text>}
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
      {hint ? <Text style={[styles.fieldHint, error && styles.fieldHintError]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  introBanner: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.champagne[400],
  },
  introBannerTitle: { fontSize: 16, fontWeight: '700', color: Colors.champagne[400] },
  introBannerBody: { fontSize: 13, color: Colors.plum[300], lineHeight: 19 },
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  switchLabel: { fontSize: 15, color: Colors.ivory, fontWeight: '500' },
  switchSub: { fontSize: 12, color: Colors.plum[400], marginTop: 2 },
  sponsorSection: { gap: 14, borderTopWidth: 1, borderTopColor: Colors.plum[800], paddingTop: 8 },
  sponsorSectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.ivory },
  sponsorSectionSub: { fontSize: 13, color: Colors.plum[400], lineHeight: 19 },
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
