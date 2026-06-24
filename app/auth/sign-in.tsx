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
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

          <Pressable onPress={() => Alert.alert('Coming soon', 'Password reset coming soon.')}>
            <Text style={styles.forgotPassword}>Forgot password?</Text>
          </Pressable>

          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>or</Text>
            <View style={styles.separatorLine} />
          </View>

          <Pressable
            style={styles.googleButton}
            onPress={() => Alert.alert('Coming soon', 'Google sign-in coming soon.')}
          >
            <Text style={styles.googleButtonIcon}>G</Text>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/auth/sign-up')} style={styles.footerLink}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text style={styles.footerLinkBold}>Sign up</Text>
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
});
