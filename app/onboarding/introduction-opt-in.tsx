import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

type OptionKey = 'not_yet' | 'after_two' | 'yes_open';

interface IntroOption {
  key: OptionKey;
  icon: string;
  title: string;
  description: string;
  requiresTwoIntros: boolean;
}

const OPTIONS: IntroOption[] = [
  {
    key: 'not_yet',
    icon: '🌿',
    title: 'Not right now',
    description: "I'll explore The Nest first.",
    requiresTwoIntros: false,
  },
  {
    key: 'after_two',
    icon: '✦',
    title: 'Yes, after I make 2 Introductions',
    description: "I'll become Open once I've introduced two people.",
    requiresTwoIntros: false,
  },
  {
    key: 'yes_open',
    icon: '✨',
    title: "Yes, I'm open now",
    description: 'Requires completing 2 Introductions first.',
    requiresTwoIntros: true,
  },
];

export default function IntroductionOptInScreen() {
  const { appUser } = useAuthStore();
  const [selected, setSelected] = useState<OptionKey>('after_two');
  const [saving, setSaving] = useState(false);
  const introductionsMade = appUser?.introductions_made ?? 0;

  async function handleEnter() {
    if (!appUser?.id) {
      router.replace('/(tabs)/nest');
      return;
    }
    setSaving(true);

    // Map to the dating_preferences intro_open_status enum values
    const statusMap: Record<OptionKey, string> = {
      not_yet:    'not_yet',
      after_two:  'after_two',
      yes_open:   introductionsMade >= 2 ? 'yes_open' : 'after_two',
    };

    await supabase
      .from('dating_preferences')
      .upsert({
        user_id: appUser.id,
        intro_open_status: statusMap[selected],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    // Mark onboarding complete
    await supabase
      .from('app_users')
      .update({ onboarding_status: 'complete', updated_at: new Date().toISOString() })
      .eq('id', appUser.id);

    setSaving(false);
    router.replace('/(tabs)/nest');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.heading}>Are you open to introductions?</Text>
          <Text style={styles.subtitle}>
            Introduced works because real people make thoughtful introductions. You are in control.
          </Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const disabled = opt.requiresTwoIntros && introductionsMade < 2;
            const isSelected = selected === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  disabled && styles.optionCardDisabled,
                ]}
                onPress={() => !disabled && setSelected(opt.key)}
                disabled={disabled}
              >
                <Text style={styles.optionIcon}>{opt.icon}</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, disabled && styles.optionTitleDim]}>
                    {opt.title}
                  </Text>
                  <Text style={[styles.optionDescription, disabled && styles.optionDescDim]}>
                    {opt.description}
                  </Text>
                </View>
                {isSelected && !disabled && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
          onPress={handleEnter}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={Colors.ivory} />
            : <Text style={styles.primaryButtonText}>Enter The Nest</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },
  header: { marginTop: 48, marginBottom: 36 },
  heading: { fontSize: 30, fontWeight: '700', color: Colors.ivory, marginBottom: 12 },
  subtitle: { fontSize: 16, color: Colors.champagne[400], lineHeight: 24 },
  options: { gap: 14, marginBottom: 36 },
  optionCard: {
    backgroundColor: Colors.plum[800],
    borderRadius: 16, borderWidth: 2, borderColor: Colors.plum[700],
    padding: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 14,
  },
  optionCardSelected: { borderColor: Colors.blush[500], backgroundColor: 'rgba(226,80,122,0.08)' },
  optionCardDisabled: { opacity: 0.4 },
  optionIcon: { fontSize: 28, lineHeight: 34 },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: Colors.ivory, marginBottom: 4 },
  optionTitleDim: { color: Colors.plum[300] },
  optionDescription: { fontSize: 14, color: Colors.champagne[400], lineHeight: 20 },
  optionDescDim: { color: Colors.plum[400] },
  selectedBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.blush[500], alignItems: 'center', justifyContent: 'center',
  },
  selectedBadgeText: { fontSize: 14, color: Colors.ivory, fontWeight: '700' },
  primaryButton: {
    backgroundColor: Colors.blush[500], borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: Colors.ivory },
});
