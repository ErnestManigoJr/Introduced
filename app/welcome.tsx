import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { supabase } from '../src/lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ENV } from '../src/lib/env';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({ scheme: ENV.appScheme, path: 'auth/callback' });

export default function WelcomeScreen() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

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
        // On success, deep link triggers auth/callback
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
      setGoogleLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert('Apple sign-in failed', 'No identity token received.');
        setAppleLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        Alert.alert('Apple sign-in failed', error.message);
        setAppleLoading(false);
        return;
      }

      // Session is now set — let the root layout's onAuthStateChange pick it up
      // and navigate via index.tsx
      router.replace('/');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', e.message ?? 'Apple sign-in failed.');
      }
      setAppleLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        {/* Top: Logo + brand */}
        <View style={styles.topSection}>
          <View style={styles.heartContainer}>
            <Text style={styles.heartIcon}>♥</Text>
          </View>
          <Text style={styles.brandName}>Introduced</Text>
          <Text style={styles.tagline}>Meet through people, not swipes.</Text>
        </View>

        {/* Middle: Value prop */}
        <View style={styles.middleSection}>
          <Text style={styles.valueProp}>
            Real connections, made through people who know you best.
          </Text>
        </View>

        {/* Bottom: Auth buttons */}
        <View style={styles.bottomSection}>
          <Pressable
            style={[styles.appleButton, appleLoading && styles.buttonDisabled]}
            onPress={handleAppleSignIn}
            disabled={appleLoading}
          >
            {appleLoading ? (
              <ActivityIndicator color="#1a1a1a" />
            ) : (
              <>
                <Text style={styles.appleButtonIcon}></Text>
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
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

          <Pressable
            style={styles.emailButton}
            onPress={() => router.push('/auth/sign-up')}
          >
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </Pressable>

          <Text style={styles.legal}>
            By continuing, you confirm you are 18+ and agree to our Terms,
            Privacy Policy, and Community Guidelines.
          </Text>

          <Pressable onPress={() => router.push('/auth/sign-in')}>
            <Text style={styles.signInLink}>
              Already have an account?{' '}
              <Text style={styles.signInLinkBold}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
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
    paddingBottom: 32,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 32,
  },
  heartContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#4a2a5c',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#e2507a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  heartIcon: {
    fontSize: 48,
    color: '#e2507a',
  },
  brandName: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FAF7F2',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#edd5a0',
    letterSpacing: 0.3,
  },
  middleSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  valueProp: {
    fontSize: 17,
    color: '#c49fd5',
    textAlign: 'center',
    lineHeight: 26,
  },
  bottomSection: {
    marginTop: 'auto',
    gap: 12,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 10,
  },
  appleButtonIcon: {
    fontSize: 20,
    color: '#1a1a1a',
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
  emailButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2507a',
    borderRadius: 12,
    paddingVertical: 15,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAF7F2',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  legal: {
    fontSize: 11,
    color: '#c49fd5',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
  },
  signInLink: {
    fontSize: 14,
    color: '#c49fd5',
    textAlign: 'center',
    marginTop: 8,
  },
  signInLinkBold: {
    color: '#e2507a',
    fontWeight: '600',
  },
});
