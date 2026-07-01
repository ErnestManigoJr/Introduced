import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

const GENDER_OPTIONS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say', 'Other'];
const INTENTION_OPTIONS = [
  { key: 'friendship', label: 'Friendship' },
  { key: 'dating',     label: 'Dating'      },
  { key: 'both',       label: 'Both'        },
];

// Onboarding step context — profile-setup is step 3 of ~6
const ONBOARDING_STEP = 3;
const ONBOARDING_TOTAL = 6;

export default function ProfileSetupScreen() {
  const { appUser, setAppUser } = useAuthStore();

  const [avatarUri, setAvatarUri]   = useState<string | null>(null);
  const [bio, setBio]               = useState('');
  const [city, setCity]             = useState('');
  const [stateVal, setStateVal]     = useState('');
  const [gender, setGender]         = useState('');
  const [intention, setIntention]   = useState('both');
  const [saving, setSaving]         = useState(false);

  // ── Avatar picker ────────────────────────────────────────────────────────
  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  // ── Avatar upload ────────────────────────────────────────────────────────
  async function uploadAvatar(userId: string): Promise<string | null> {
    if (!avatarUri) return null;
    try {
      const response = await fetch(avatarUri);
      const arrayBuffer = await response.arrayBuffer();
      const mimeType = response.headers.get('content-type') ?? 'image/jpeg';
      const ext = mimeType.split('/')[1]?.split('+')[0] ?? 'jpg';
      const path = `avatars/${userId}.${ext}`;

      const { error } = await supabase.storage.from('media').upload(path, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
      });
      if (error) {
        console.error('[ProfileSetup] avatar upload error:', error.message);
        return null;
      }
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.error('[ProfileSetup] avatar upload exception:', e);
      return null;
    }
  }

  // ── Save & continue ──────────────────────────────────────────────────────
  async function handleContinue() {
    if (!appUser?.id) {
      // No user record yet — shouldn't happen, but skip gracefully
      router.push('/onboarding/privacy-preferences');
      return;
    }
    setSaving(true);

    const avatarUrl = await uploadAvatar(appUser.id);

    const profilePayload: Record<string, unknown> = {
      user_id: appUser.id,
      bio: bio.trim() || null,
      city: city.trim() || null,
      state: stateVal.trim() || null,
      gender: gender || null,
      relationship_intention: intention,
      updated_at: new Date().toISOString(),
    };
    if (avatarUrl) profilePayload.avatar_url = avatarUrl;

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'user_id' });

    if (profileError) {
      Alert.alert(
        'Could not save profile',
        'Your profile info will be editable from Settings later.',
      );
    }

    // Also update bio on app_users so Me tab can show it without a profiles join
    if (bio.trim()) {
      await supabase
        .from('app_users')
        .update({ bio: bio.trim(), updated_at: new Date().toISOString() })
        .eq('id', appUser.id);
    }

    // Refresh store
    const { data: updated } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', appUser.id)
      .maybeSingle();
    if (updated) setAppUser(updated as any);

    setSaving(false);
    router.push('/onboarding/privacy-preferences');
  }

  function handleSkip() {
    router.push('/onboarding/privacy-preferences');
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Progress bar */}
        <View style={styles.progressOuter}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(ONBOARDING_STEP / ONBOARDING_TOTAL) * 100}%` as any },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            Step {ONBOARDING_STEP} of {ONBOARDING_TOTAL}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Almost there</Text>
            <Text style={styles.heading}>Set up your profile.</Text>
            <Text style={styles.subtitle}>
              Help others get a feel for who you are. Everything here is optional — you can
              always update it later.
            </Text>
          </View>

          {/* ── Avatar ── */}
          <Pressable style={styles.avatarWrap} onPress={pickAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {appUser?.display_name?.[0]?.toUpperCase() ?? '+'}
                </Text>
                <View style={styles.avatarBadge}>
                  <Text style={styles.avatarBadgeText}>📷</Text>
                </View>
              </View>
            )}
            <Text style={styles.avatarHint}>
              {avatarUri ? 'Tap to change' : 'Add a photo'}
            </Text>
          </Pressable>

          {/* ── Bio ── */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={styles.bioInput}
              placeholder="A short intro — what makes you, you?"
              placeholderTextColor={Colors.plum[500]}
              value={bio}
              onChangeText={(v) => setBio(v.slice(0, 300))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
            <Text style={styles.charCount}>{bio.length} / 300</Text>
          </View>

          {/* ── Location ── */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. New York"
                placeholderTextColor={Colors.plum[500]}
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>State</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. NY"
                placeholderTextColor={Colors.plum[500]}
                value={stateVal}
                onChangeText={setStateVal}
                autoCapitalize="characters"
                maxLength={30}
              />
            </View>
          </View>

          {/* ── Gender ── */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.chipGrid}>
              {GENDER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.chip, gender === opt && styles.chipSelected]}
                  onPress={() => setGender(gender === opt ? '' : opt)}
                >
                  <Text style={[styles.chipText, gender === opt && styles.chipTextSelected]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Open to ── */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>I'm open to</Text>
            <View style={styles.intentionRow}>
              {INTENTION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[styles.intentionChip, intention === opt.key && styles.chipSelected]}
                  onPress={() => setIntention(opt.key)}
                >
                  <Text
                    style={[
                      styles.intentionChipText,
                      intention === opt.key && styles.chipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
              onPress={handleContinue}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.ivory} />
              ) : (
                <Text style={styles.primaryButtonText}>Continue</Text>
              )}
            </Pressable>

            <Pressable onPress={handleSkip} disabled={saving} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.background,
  },

  // Progress
  progressOuter: {
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 10,
    gap: 5,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.plum[700],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.blush[500],
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.plum[300],
    textAlign: 'right',
    fontWeight: '500',
  },

  // Scroll content
  scroll: {
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  header: {
    marginTop: 28,
    marginBottom: 28,
    gap: 6,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.champagne[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heading: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.ivory,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.champagne[300],
    lineHeight: 21,
  },

  // Avatar
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: Colors.blush[500],
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.plum[800],
    borderWidth: 2,
    borderColor: Colors.plum[600],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.plum[400],
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.plum[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.background,
  },
  avatarBadgeText: {
    fontSize: 14,
  },
  avatarHint: {
    fontSize: 12,
    color: Colors.plum[300],
  },

  // Fields
  field: {
    marginBottom: 20,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.plum[300],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  input: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.ivory,
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  bioInput: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.ivory,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    color: Colors.plum[400],
    textAlign: 'right',
  },

  // Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.plum[800],
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  chipSelected: {
    backgroundColor: Colors.blush[500],
    borderColor: Colors.blush[500],
  },
  chipText: {
    fontSize: 14,
    color: Colors.plum[400],
  },
  chipTextSelected: {
    color: Colors.ivory,
    fontWeight: '600',
  },

  // Intention chips (equal width)
  intentionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  intentionChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.plum[800],
    borderWidth: 1,
    borderColor: Colors.plum[700],
    alignItems: 'center',
  },
  intentionChipText: {
    fontSize: 14,
    color: Colors.plum[400],
    fontWeight: '500',
  },

  // Actions
  actions: {
    marginTop: 8,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.blush[500],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ivory,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 14,
    color: Colors.plum[400],
  },
});
