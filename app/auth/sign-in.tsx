import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { ENV } from '../../src/lib/env';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({ scheme: ENV.appScheme, path: 'auth/callback' });

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot password modal state
  const [forgotVisible, setForgotVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign in failed', error.message);
      return;
    }
    router.replace('/');
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });

      if (error) {
        Alert.alert('Google sign-in failed', error.message);
        setGoogleLoading(false);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (result.type !== 'success') {
          setGoogleLoading(false);
        }
        // On success, the deep link triggers auth/callback which handles routing
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleForgotPassword() {
    const emailToReset = resetEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailToReset || !emailRegex.test(emailToReset)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
      redirectTo: redirectUri,
    });
    setResetLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setResetSent(true);
  }

  function closeForgotModal() {
    setForgotVisible(false);
    setResetEmail('');
    setResetSent(false);
    setResetLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.heading}>Welcome back.</Text>
          <Text style={styles.subtitle}>Sign in to Introduced</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#c49fd5"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#c49fd5"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <Pressable
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FAF7F2" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setForgotVisible(true)}>
            <Text style={styles.forgotPassword}>Forgot password?</Text>
          </Pressable>

          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>or</Text>
            <View style={styles.separatorLine} />
          </View>

          <Pressable
            style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#FAF7F2" />
            ) : (
              <>
                <Text style={styles.googleButtonIcon}>G</Text>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/auth/sign-up')} style={styles.footerLink}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text style={styles.footerLinkBold}>Sign up</Text>
          </Text>
        </Pressable>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotVisible}
        transparent
        animationType="fade"
        onRequestClose={closeForgotModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeForgotModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              {resetSent ? (
                <>
                  <Text style={styles.modalTitle}>Check your email</Text>
                  <Text style={styles.modalSubtitle}>
                    We sent a password reset link to{' '}
                    <Text style={styles.modalEmailBold}>{resetEmail.trim()}</Text>.
                    {'\n\n'}Follow the link in the email to set a new password.
                  </Text>
                  <Pressable style={styles.modalPrimaryButton} onPress={closeForgotModal}>
                    <Text style={styles.modalPrimaryButtonText}>Done</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Reset your password</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter the email address associated with your account and we'll send you a reset link.
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Email address"
                    placeholderTextColor="#c49fd5"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    autoFocus
                  />
                  <Pressable
                    style={[styles.modalPrimaryButton, resetLoading && styles.primaryButtonDisabled]}
                    onPress={handleForgotPassword}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#FAF7F2" />
                    ) : (
                      <Text style={styles.modalPrimaryButtonText}>Send Reset Link</Text>
                    )}
                  </Pressable>
                  <Pressable onPress={closeForgotModal} style={styles.modalCancelButton}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </Pressable>
                </>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
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
  forgotPassword: {
    fontSize: 14,
    color: '#c49fd5',
    textAlign: 'center',
    marginTop: 4,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#62397a',
  },
  separatorText: {
    fontSize: 14,
    color: '#c49fd5',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: '#FAF7F2',
    gap: 10,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAF7F2',
  },
  googleButtonText: {
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#3a2248',
    borderRadius: 20,
    padding: 28,
    gap: 16,
    borderWidth: 1,
    borderColor: '#62397a',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FAF7F2',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#c49fd5',
    lineHeight: 22,
  },
  modalEmailBold: {
    color: '#FAF7F2',
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: '#4a2a5c',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#62397a',
  },
  modalPrimaryButton: {
    backgroundColor: '#e2507a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAF7F2',
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalCancelText: {
    fontSize: 14,
    color: '#c49fd5',
  },
});
