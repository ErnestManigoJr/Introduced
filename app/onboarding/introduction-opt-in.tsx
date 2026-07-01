import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

// Onboarding step context — this is the last step before entering the app
const ONBOARDING_STEP = 6;
const ONBOARDING_TOTAL = 6;

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
    description: "I'll explore The Nest first and open up when I'm ready.",
    requiresTwoIntros: false,
  },
  {
    key: 'after_two',
    icon: '✦',
    title: 'Yes — after I make 2 Introductions',
    description:
      "I'll become Open once I've introduced two people. This is the recommended path.",
    requiresTwoIntros: false,
  },
  {
    key: 'yes_open',
    icon: '✨',
    title: "Yes, I'm open right now",
    description:
      'Requires completing 2 Introductions first. Unlock this by introducing two people.',
    requiresTwoIntros: true,
  },
];

export default function IntroductionOptInScreen() {
  const { appUser, setAppUser } = useAuthStore();
  const [selected, setSelected] = useState<OptionKey>('after_two');
  const [saving, setSaving] = useState(false);

  const introductionsMade = appUser?.introductions_made ?? 0;

  async function handleEnter() {
    setSaving(true);

    if (appUser?.id) {
      // Map selection to DB enum — cap yes_open if user hasn't made 2 intros yet
      const statusMap: Record<OptionKey, string> = {
        not_yet:   'not_yet',
        after_two: 'after_two',
        yes_open:  introductionsMade >= 2 ? 'yes_open' : 'after_two',
      };

      await supabase
        .from('dating_preferences')
        .upsert(
          {
            user_id:           appUser.id,
            intro_open_status: statusMap[selected],
            updated_at:        new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      // Mark onboarding complete
      await supabase
        .from('app_users')
        .update({
          onboarding_status: 'complete',
          updated_at:        new Date().toISOString(),
        })
        .eq('id', appUser.id);

      // Refresh store so onboarding_status is up to date everywhere
      const { data: updated } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', appUser.id)
        .maybeSingle();

      if (updated) setAppUser(updated as any);
    }

    setSaving(false);
    router.replace('/(tabs)/nest');
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress bar — full at the last step */}
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
          Step {ONBOARDING_STEP} of {ONBOARDING_TOTAL} — Last step
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Almost in</Text>
          <Text style={styles.heading}>Are you open to introductions?</Text>
          <Text style={styles.subtitle}>
            Introduced works because real people make thoughtful introductions. You are always
            in control of who can be introduced to you.
          </Text>
        </View>

        {/* How it works callout */}
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>How introductions work</Text>
          <Text style={styles.calloutBody}>
            A mutual connection who knows both of you reaches out to make an introduction. You
            choose whether to accept. No cold messages — only warm connections from people who
            think you'd genuinely click.
          </Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const disabled = opt.requiresTwoIntros && introductionsMade < 2;
            const isSelected = selected === opt.key;

            return (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  disabled && styles.optionCardDisabled,
                  pressed && !disabled && styles.optionCardPressed,
                ]}
                onPress={() => !disabled && setSelected(opt.key)}
                disabled={disabled}
              >
                <Text style={[styles.optionIcon, disabled && styles.dimmed]}>
                  {opt.icon}
                </Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, disabled && styles.dimmed]}>
                    {opt.title}
                  </Text>
                  <Text style={[styles.optionDescription, disabled && styles.dimmed]}>
                    {opt.description}
                  </Text>
                  {disabled && (
                    <Text style={styles.lockedLabel}>
                      Make 2 introductions to unlock
                    </Text>
                  )}
                </View>
                {isSelected && !disabled && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkBadgeText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* CTA */}
        <Pressable
          style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
          onPress={handleEnter}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.ivory} />
          ) : (
            <Text style={styles.primaryButtonText}>Enter The Nest</Text>
          )}
        </Pressable>

        <Text style={styles.footerNote}>
          You can change this preference anytime from your profile settings.
        </Text>
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

  // Content
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  header: {
    marginTop: 28,
    marginBottom: 24,
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
    fontSize: 28,
    fontWeight: '700',
    color: Colors.ivory,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.champagne[300],
    lineHeight: 21,
  },

  // How it works callout
  callout: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    marginBottom: 24,
    gap: 6,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.champagne[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calloutBody: {
    fontSize: 14,
    color: Colors.plum[200],
    lineHeight: 21,
  },

  // Option cards
  options: {
    gap: 12,
    marginBottom: 28,
  },
  optionCard: {
    backgroundColor: Colors.plum[800],
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.plum[700],
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  optionCardSelected: {
    borderColor: Colors.blush[500],
    backgroundColor: 'rgba(226, 80, 122, 0.08)',
  },
  optionCardDisabled: {
    opacity: 0.45,
  },
  optionCardPressed: {
    opacity: 0.8,
  },
  optionIcon: {
    fontSize: 26,
    lineHeight: 32,
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ivory,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.champagne[300],
    lineHeight: 19,
  },
  lockedLabel: {
    fontSize: 12,
    color: Colors.champagne[500],
    fontWeight: '500',
    marginTop: 2,
  },
  dimmed: {
    color: Colors.plum[400],
  },
  checkBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.blush[500],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  checkBadgeText: {
    fontSize: 14,
    color: Colors.ivory,
    fontWeight: '700',
  },

  // CTA
  primaryButton: {
    backgroundColor: Colors.blush[500],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ivory,
  },
  footerNote: {
    fontSize: 12,
    color: Colors.plum[400],
    textAlign: 'center',
    lineHeight: 18,
  },
});
