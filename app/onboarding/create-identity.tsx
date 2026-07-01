import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { Theme, Colors } from '../../src/constants/colors';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

// Step indicator — 2 steps on this screen: username, then display name
const STEPS = [
  { label: 'Choose a username' },
  { label: 'Add your display name' },
];

export default function CreateIdentityScreen() {
  const { setAppUser } = useAuthStore();

  const [step, setStep] = useState<0 | 1>(0);

  // Step 0 — username
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');

  // Step 1 — display name
  const [displayName, setDisplayName] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');

  // Submission
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Username availability check ─────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!username) { setUsernameStatus('idle'); return; }

    const lower = username.toLowerCase();
    if (!USERNAME_REGEX.test(lower)) { setUsernameStatus('invalid'); return; }

    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('app_users')
        .select('id')
        .eq('username', lower)
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
  }, [username]);

  // ── Derived state ────────────────────────────────────────────────────────
  const usernameValid = usernameStatus === 'available';
  const displayNameValid =
    displayName.trim().length >= 2 && displayName.trim().length <= 40;

  function handleDisplayNameChange(val: string) {
    setDisplayName(val);
    setSaveError('');
    if (val.trim().length > 0 && val.trim().length < 2) {
      setDisplayNameError('At least 2 characters.');
    } else if (val.trim().length > 40) {
      setDisplayNameError('40 characters max.');
    } else {
      setDisplayNameError('');
    }
  }

  // ── Step 0 → Step 1 ─────────────────────────────────────────────────────
  function handleUsernameNext() {
    if (!usernameValid) return;
    setStep(1);
  }

  // ── Final submission ─────────────────────────────────────────────────────
  async function handleContinue() {
    if (!displayNameValid) return;
    setSaving(true);
    setSaveError('');

    try {
      // Get the current auth session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setSaveError('Session expired. Please sign in again.');
        setSaving(false);
        return;
      }

      const authUserId = session.user.id;
      const email = session.user.email ?? '';
      const lower = username.toLowerCase();

      // Check if an app_users row already exists (e.g. re-entering this screen)
      const { data: existing } = await supabase
        .from('app_users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (existing?.id) {
        // Row exists — just update username + display_name
        const { error: updateError } = await supabase
          .from('app_users')
          .update({
            username: lower,
            display_name: displayName.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw new Error(updateError.message);
      } else {
        // New row — insert
        const { error: insertError } = await supabase
          .from('app_users')
          .insert({
            auth_user_id: authUserId,
            email,
            username: lower,
            display_name: displayName.trim(),
            is_18_confirmed: true,
            terms_accepted_at: new Date().toISOString(),
            privacy_accepted_at: new Date().toISOString(),
            community_guidelines_accepted_at: new Date().toISOString(),
            dating_disclaimer_accepted_at: new Date().toISOString(),
            account_status: 'active',
            onboarding_status: 'incomplete',
            connection_style_complete: false,
            connection_style: null,
            bio: null,
            introductions_made: 0,
            introductions_received: 0,
            connections_count: 0,
            open_to_introductions: false,
          });

        if (insertError) {
          // Username race condition — another user just took it
          if (insertError.code === '23505') {
            setStep(0);
            setUsernameStatus('taken');
            setSaveError('That username was just taken. Please choose another.');
            setSaving(false);
            return;
          }
          throw new Error(insertError.message);
        }
      }

      // Refresh auth store with the newly created/updated user
      const { data: appUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      setAppUser(appUser ?? null);
      router.push('/onboarding/profile-setup');
    } catch (e: any) {
      setSaveError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Username hint text ───────────────────────────────────────────────────
  function getUsernameHint() {
    switch (usernameStatus) {
      case 'checking': return null;
      case 'available': return { text: '✓ Available', color: Colors.success ?? '#4ade80' };
      case 'taken': return { text: 'Already taken.', color: Colors.blush[500] };
      case 'invalid':
        return {
          text: '3–20 characters: lowercase letters, numbers, underscores only.',
          color: Colors.blush[500],
        };
      default: return null;
    }
  }

  const usernameHint = getUsernameHint();

  // ── Step indicator ───────────────────────────────────────────────────────
  const progress = (step + 1) / STEPS.length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress bar */}
      <View style={styles.progressOuter}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>{step + 1} of {STEPS.length}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Step 0: Username ── */}
        {step === 0 && (
          <>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Step 1</Text>
              <Text style={styles.heading}>Choose a username.</Text>
              <Text style={styles.subtitle}>
                This is how others will find you on Introduced. You can change it later.
              </Text>
            </View>

            <View style={styles.form}>
              <View>
                <View style={styles.usernameRow}>
                  <View style={styles.atPrefix}>
                    <Text style={styles.atSymbol}>@</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.usernameInput,
                      (usernameStatus === 'taken' || usernameStatus === 'invalid') &&
                        styles.inputError,
                      usernameStatus === 'available' && styles.inputSuccess,
                    ]}
                    placeholder="yourname"
                    placeholderTextColor={Colors.plum[500]}
                    value={username}
                    onChangeText={(v) =>
                      setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    maxLength={20}
                  />
                  {usernameStatus === 'checking' && (
                    <ActivityIndicator
                      size="small"
                      color={Colors.plum[300]}
                      style={styles.checkingSpinner}
                    />
                  )}
                </View>
                {usernameHint && (
                  <Text style={[styles.hintText, { color: usernameHint.color }]}>
                    {usernameHint.text}
                  </Text>
                )}
                <Text style={styles.helperText}>
                  Lowercase letters, numbers, and underscores only. 3–20 characters.
                </Text>
              </View>

              <Pressable
                style={[styles.primaryButton, !usernameValid && styles.primaryButtonDisabled]}
                onPress={handleUsernameNext}
                disabled={!usernameValid}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── Step 1: Display name ── */}
        {step === 1 && (
          <>
            <View style={styles.header}>
              <Pressable onPress={() => setStep(0)} style={styles.backBtn} hitSlop={12}>
                <Text style={styles.backText}>← @{username}</Text>
              </Pressable>
              <Text style={styles.eyebrow}>Step 2</Text>
              <Text style={styles.heading}>What should we call you?</Text>
              <Text style={styles.subtitle}>
                Your display name is what others see when you're introduced. It can be your real
                name, a nickname — whatever feels like you.
              </Text>
            </View>

            <View style={styles.form}>
              <View>
                <TextInput
                  style={[styles.input, displayNameError ? styles.inputError : null]}
                  placeholder="e.g. Jordan or Jordan Lee"
                  placeholderTextColor={Colors.plum[500]}
                  value={displayName}
                  onChangeText={handleDisplayNameChange}
                  maxLength={40}
                  autoFocus
                />
                <View style={styles.inputMeta}>
                  {displayNameError ? (
                    <Text style={styles.errorText}>{displayNameError}</Text>
                  ) : (
                    <View />
                  )}
                  <Text style={styles.charCount}>{displayName.trim().length} / 40</Text>
                </View>
              </View>

              {saveError ? (
                <View style={styles.saveErrorBox}>
                  <Text style={styles.saveErrorText}>{saveError}</Text>
                </View>
              ) : null}

              <Pressable
                style={[
                  styles.primaryButton,
                  (!displayNameValid || saving) && styles.primaryButtonDisabled,
                ]}
                onPress={handleContinue}
                disabled={!displayNameValid || saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.ivory} />
                ) : (
                  <Text style={styles.primaryButtonText}>Create My Profile</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
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
    paddingBottom: 12,
    gap: 6,
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

  // Content
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
    gap: 8,
  },
  backBtn: {
    marginBottom: 4,
  },
  backText: {
    fontSize: 14,
    color: Colors.plum[300],
    fontWeight: '500',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.champagne[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.ivory,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.champagne[300],
    lineHeight: 23,
  },

  // Form
  form: {
    gap: 16,
  },

  // Username row
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  atPrefix: {
    backgroundColor: Colors.plum[800],
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: Colors.plum[700],
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  atSymbol: {
    fontSize: 18,
    color: Colors.plum[300],
    fontWeight: '600',
  },
  usernameInput: {
    flex: 1,
    backgroundColor: Colors.plum[800],
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    color: Colors.ivory,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    letterSpacing: 0.3,
  },
  checkingSpinner: {
    position: 'absolute',
    right: 12,
  },

  // Text input
  input: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: Colors.ivory,
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },

  inputError: {
    borderColor: Colors.blush[500],
  },
  inputSuccess: {
    borderColor: '#4ade80',
  },

  inputMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  hintText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
    lineHeight: 18,
  },
  helperText: {
    fontSize: 12,
    color: Colors.plum[400],
    marginTop: 4,
    marginLeft: 2,
  },
  errorText: {
    fontSize: 12,
    color: Colors.blush[500],
  },
  charCount: {
    fontSize: 12,
    color: Colors.plum[400],
  },

  // Save error
  saveErrorBox: {
    backgroundColor: 'rgba(226, 80, 122, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.blush[500],
  },
  saveErrorText: {
    fontSize: 13,
    color: Colors.blush[400],
    lineHeight: 18,
  },

  // Button
  primaryButton: {
    backgroundColor: Colors.blush[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ivory,
  },
});
