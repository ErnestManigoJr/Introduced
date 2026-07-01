import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  function validate(): boolean {
    const newErrors: typeof errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  async function handleSignUp() {
    if (!validate()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setErrors({ email: error.message });
      return;
    }
    // If session is null but user exists, Supabase requires email confirmation
    if (data.user && !data.session) {
      setAwaitingConfirm(true);
      return;
    }
    // Session exists — confirmation disabled, proceed directly
    router.replace('/onboarding/age-consent');
  }

  if (awaitingConfirm) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmIcon}>✉</Text>
          <Text style={styles.confirmHeading}>Check your email</Text>
          <Text style={styles.confirmBody}>
            We sent a confirmation link to{' '}
            <Text style={styles.confirmEmail}>{email.trim()}</Text>.
            Tap the link to verify your account, then come back and sign in.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/auth/sign-in')}
          >
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
          </Pressable>
          <Pressable
            style={styles.resendBtn}
            onPress={async () => {
              await supabase.auth.resend({ type: 'signup', email: email.trim() });
            }}
          >
            <Text style={styles.resendText}>Resend confirmation email</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.heading}>Create your account.</Text>
          <Text style={styles.subtitle}>Join Introduced — meet through people, not swipes.</Text>
        </View>

        <View style={styles.form}>
          <View>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="Email address"
              placeholderTextColor="#c49fd5"
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder="Password (min 8 characters)"
              placeholderTextColor="#c49fd5"
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
              secureTextEntry
              autoComplete="new-password"
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <View>
            <TextInput
              style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
              placeholder="Confirm password"
              placeholderTextColor="#c49fd5"
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirmPassword: undefined })); }}
              secureTextEntry
              autoComplete="new-password"
            />
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
          </View>

          <Pressable
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FAF7F2" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/auth/sign-in')} style={styles.footerLink}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.footerLinkBold}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D1B35',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: '#FAF7F2',
  },
  header: {
    marginTop: 24,
    marginBottom: 36,
  },
  heading: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FAF7F2',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#edd5a0',
    lineHeight: 24,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: '#4a2a5c',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#62397a',
  },
  inputError: {
    borderColor: '#e2507a',
  },
  errorText: {
    fontSize: 12,
    color: '#e2507a',
    marginTop: 4,
    marginLeft: 4,
  },
  primaryButton: {
    backgroundColor: '#e2507a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAF7F2',
  },
  footerLink: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#c49fd5',
  },
  footerLinkBold: {
    color: '#e2507a',
    fontWeight: '600',
  },
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  confirmIcon: {
    fontSize: 52,
    color: '#edd5a0',
  },
  confirmHeading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FAF7F2',
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: 15,
    color: '#c49fd5',
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmEmail: {
    color: '#FAF7F2',
    fontWeight: '600',
  },
  resendBtn: {
    paddingVertical: 10,
  },
  resendText: {
    fontSize: 14,
    color: '#e2507a',
    fontWeight: '500',
  },
});
