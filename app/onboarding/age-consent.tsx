import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';

function isAtLeast18(month: string, day: string, year: string): boolean {
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return false;
  const dob = new Date(y, m - 1, d);
  const now = new Date();
  const age18 = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
  return now >= age18;
}

export default function AgeConsentScreen() {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [attempted, setAttempted] = useState(false);

  const allFilled = month.length > 0 && day.length > 0 && year.length === 4;
  const valid = allFilled && isAtLeast18(month, day, year);
  const showError = attempted && allFilled && !valid;

  function handleContinue() {
    setAttempted(true);
    if (!valid) return;
    router.push('/onboarding/legal-consent');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.heading}>You must be 18 or older.</Text>
          <Text style={styles.subtitle}>
            Introduced is for adults only. Please confirm your date of birth.
          </Text>
        </View>

        <View style={styles.dobRow}>
          <View style={styles.dobField}>
            <Text style={styles.dobLabel}>Month</Text>
            <TextInput
              style={styles.dobInput}
              placeholder="MM"
              placeholderTextColor="#c49fd5"
              value={month}
              onChangeText={(v) => { setAttempted(false); setMonth(v.replace(/\D/g, '').slice(0, 2)); }}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
          <View style={styles.dobField}>
            <Text style={styles.dobLabel}>Day</Text>
            <TextInput
              style={styles.dobInput}
              placeholder="DD"
              placeholderTextColor="#c49fd5"
              value={day}
              onChangeText={(v) => { setAttempted(false); setDay(v.replace(/\D/g, '').slice(0, 2)); }}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
          <View style={[styles.dobField, styles.dobFieldYear]}>
            <Text style={styles.dobLabel}>Year</Text>
            <TextInput
              style={styles.dobInput}
              placeholder="YYYY"
              placeholderTextColor="#c49fd5"
              value={year}
              onChangeText={(v) => { setAttempted(false); setYear(v.replace(/\D/g, '').slice(0, 4)); }}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
        </View>

        {showError && (
          <Text style={styles.errorText}>
            You must be 18 or older to use Introduced.
          </Text>
        )}

        <Pressable
          style={[styles.primaryButton, !valid && styles.primaryButtonDisabled]}
          onPress={handleContinue}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
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
  header: {
    marginTop: 64,
    marginBottom: 48,
  },
  heading: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FAF7F2',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#edd5a0',
    lineHeight: 24,
  },
  dobRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dobField: {
    flex: 1,
  },
  dobFieldYear: {
    flex: 1.4,
  },
  dobLabel: {
    fontSize: 12,
    color: '#c49fd5',
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dobInput: {
    backgroundColor: '#4a2a5c',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    color: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#62397a',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#e2507a',
    marginBottom: 16,
    textAlign: 'center',
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
