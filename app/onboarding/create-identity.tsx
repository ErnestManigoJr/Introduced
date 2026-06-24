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
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export default function CreateIdentityScreen() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [displayNameError, setDisplayNameError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!username) {
      setUsernameStatus('idle');
      return;
    }
    const lower = username.toLowerCase();
    if (!USERNAME_REGEX.test(lower)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('app_users')
        .select('id')
        .eq('username', lower)
        .single();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
  }, [username]);

  const usernameValid = usernameStatus === 'available';
  const displayNameValid = displayName.trim().length >= 2 && displayName.trim().length <= 40;
  const canContinue = usernameValid && displayNameValid;

  function handleDisplayNameChange(val: string) {
    setDisplayName(val);
    if (val.trim().length < 2 && val.length > 0) {
      setDisplayNameError('Display name must be at least 2 characters.');
    } else if (val.trim().length > 40) {
      setDisplayNameError('Display name must be 40 characters or fewer.');
    } else {
      setDisplayNameError('');
    }
  }

  function handleContinue() {
    if (!canContinue) return;
    router.push('/onboarding/profile-setup');
  }

  function getUsernameStatusText() {
    switch (usernameStatus) {
      case 'checking': return null;
      case 'available': return '✓ Username available';
      case 'taken': return 'Username is already taken.';
      case 'invalid':
        return 'Username must be 3–20 characters: lowercase letters, numbers, and underscores only.';
      default: return null;
    }
  }

  const statusText = getUsernameStatusText();
  const statusColor = usernameStatus === 'available' ? '#4ade80' : '#e2507a';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.heading}>Create your identity.</Text>
          <Text style={styles.subtitle}>
            Choose a username and display name for Introduced.
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
                  usernameStatus === 'taken' || usernameStatus === 'invalid' ? styles.inputError : null,
                  usernameStatus === 'available' ? styles.inputSuccess : null,
                ]}
                placeholder="username"
                placeholderTextColor="#c49fd5"
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
              {usernameStatus === 'checking' && (
                <ActivityIndicator size="small" color="#c49fd5" style={styles.checkingIndicator} />
              )}
            </View>
            {statusText ? (
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            ) : null}
          </View>

          <View>
            <TextInput
              style={[styles.input, displayNameError ? styles.inputError : null]}
              placeholder="Display name"
              placeholderTextColor="#c49fd5"
              value={displayName}
              onChangeText={handleDisplayNameChange}
              maxLength={40}
            />
            {displayNameError ? <Text style={styles.errorText}>{displayNameError}</Text> : null}
          </View>

          <Pressable
            style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
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
    paddingBottom: 40,
  },
  header: {
    marginTop: 64,
    marginBottom: 36,
  },
  heading: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FAF7F2',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#edd5a0',
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  atPrefix: {
    backgroundColor: '#4a2a5c',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: '#62397a',
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  atSymbol: {
    fontSize: 18,
    color: '#c49fd5',
    fontWeight: '600',
  },
  usernameInput: {
    flex: 1,
    backgroundColor: '#4a2a5c',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#62397a',
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
  inputSuccess: {
    borderColor: '#4ade80',
  },
  checkingIndicator: {
    position: 'absolute',
    right: 12,
  },
  statusText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAF7F2',
  },
});
