import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

// Onboarding step context
const ONBOARDING_STEP = 4;
const ONBOARDING_TOTAL = 6;

const OPEN_TO_OPTIONS = [
  { key: 'friendship',   label: 'Building a real friendship first', icon: '🤝' },
  { key: 'dating',       label: 'Dating and seeing where it goes',  icon: '✨' },
  { key: 'relationship', label: 'A committed relationship',          icon: '💛' },
  { key: 'both',         label: 'Open to friendship or dating',      icon: '✦'  },
  { key: 'not_sure',     label: "I'm not sure yet",                  icon: '🌿' },
];

const PACE_OPTIONS = [
  { key: 'slow',    label: 'Slow and intentional', sub: 'I like to build a foundation first' },
  { key: 'natural', label: 'Natural',               sub: 'Wherever it flows'                 },
  { key: 'steady',  label: 'Steady',                sub: 'Consistent effort from both sides' },
  { key: 'direct',  label: 'Direct',                sub: 'I know what I want'                },
];

const NON_NEGOTIABLES = [
  { key: 'honesty',                label: 'Honesty'                 },
  { key: 'emotional_availability', label: 'Emotional availability'  },
  { key: 'ambition',               label: 'Drive and ambition'      },
  { key: 'kindness',               label: 'Genuine kindness'        },
  { key: 'humor',                  label: 'A good sense of humor'   },
  { key: 'faith',                  label: 'Shared faith or values'  },
  { key: 'family_oriented',        label: 'Family-oriented'         },
  { key: 'independence',           label: 'Respects independence'   },
  { key: 'ambition',               label: 'Drive and ambition'      },
  { key: 'communication',          label: 'Open communication'      },
  { key: 'loyalty',                label: 'Loyalty'                 },
  { key: 'growth_mindset',         label: 'Growth mindset'          },
];

// Deduplicate by key
const UNIQUE_NON_NEGOTIABLES = Array.from(
  new Map(NON_NEGOTIABLES.map((n) => [n.key, n])).values()
);

export default function DatingPreferencesScreen() {
  const { appUser } = useAuthStore();

  const [openTo, setOpenTo]               = useState('both');
  const [pace, setPace]                   = useState('natural');
  const [nonNegotiables, setNonNegotiables] = useState<string[]>([]);
  const [saving, setSaving]               = useState(false);

  function toggleNN(key: string) {
    setNonNegotiables((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleContinue() {
    if (!appUser?.id) {
      router.push('/onboarding/introduction-opt-in');
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from('dating_preferences')
      .upsert(
        {
          user_id:              appUser.id,
          open_to:              openTo,
          relationship_pace:    pace,
          non_negotiables:      nonNegotiables,
          intro_open_status:    'after_two',
          updated_at:           new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      Alert.alert('Could not save preferences', 'You can update these later from your profile.');
    }

    setSaving(false);
    router.push('/onboarding/introduction-opt-in');
  }

  function handleSkip() {
    router.push('/onboarding/introduction-opt-in');
  }

  return (
    <SafeAreaView style={styles.safe}>
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Connection preferences</Text>
          <Text style={styles.heading}>What are you looking for?</Text>
          <Text style={styles.subtitle}>
            This helps Introduced surface introductions that actually make sense for you.
            You can update this anytime.
          </Text>
        </View>

        {/* ── Open to ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What are you open to right now?</Text>
          <View style={styles.optionList}>
            {OPEN_TO_OPTIONS.map((opt) => {
              const selected = openTo === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    styles.optionCard,
                    selected && styles.optionCardSelected,
                    pressed && styles.optionCardPressed,
                  ]}
                  onPress={() => setOpenTo(opt.key)}
                >
                  <Text style={styles.optionIcon}>{opt.icon}</Text>
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                  {selected && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkBadgeText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Relationship pace ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What relationship pace feels right?</Text>
          <View style={styles.optionList}>
            {PACE_OPTIONS.map((opt) => {
              const selected = pace === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    styles.optionCard,
                    selected && styles.optionCardSelected,
                    pressed && styles.optionCardPressed,
                  ]}
                  onPress={() => setPace(opt.key)}
                >
                  <View style={styles.paceText}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.optionSub}>{opt.sub}</Text>
                  </View>
                  {selected && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkBadgeText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Non-negotiables ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Non-negotiables</Text>
          <Text style={styles.sectionHint}>
            Select everything that matters most to you in a connection
          </Text>
          <View style={styles.chipGrid}>
            {UNIQUE_NON_NEGOTIABLES.map((item) => {
              const selected = nonNegotiables.includes(item.key);
              return (
                <Pressable
                  key={item.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleNN(item.key)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {nonNegotiables.length > 0 && (
            <Text style={styles.selectedCount}>
              {nonNegotiables.length} selected
            </Text>
          )}
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

  // Sections
  section: {
    marginBottom: 28,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.plum[300],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.plum[400],
    marginTop: -4,
  },

  // Option cards
  optionList: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.plum[700],
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  optionCardSelected: {
    borderColor: Colors.blush[500],
    backgroundColor: 'rgba(226, 80, 122, 0.08)',
  },
  optionCardPressed: {
    opacity: 0.8,
  },
  optionIcon: {
    fontSize: 20,
    lineHeight: 26,
  },
  paceText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
    color: Colors.plum[200],
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: Colors.ivory,
    fontWeight: '600',
  },
  optionSub: {
    fontSize: 12,
    color: Colors.plum[500],
  },
  checkBadge: {
    marginLeft: 'auto',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.blush[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: {
    fontSize: 13,
    color: Colors.ivory,
    fontWeight: '700',
  },

  // Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
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
  selectedCount: {
    fontSize: 12,
    color: Colors.champagne[400],
    marginTop: 4,
  },

  // Actions
  actions: {
    gap: 12,
    marginTop: 4,
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
