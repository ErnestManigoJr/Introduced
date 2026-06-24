import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';

type OptionKey = 'not_now' | 'after_two' | 'open_now';

interface IntroOption {
  key: OptionKey;
  icon: string;
  title: string;
  description: string;
  requiresTwoIntros: boolean;
}

const OPTIONS: IntroOption[] = [
  {
    key: 'not_now',
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
    key: 'open_now',
    icon: '✨',
    title: "Yes, I'm open now",
    description: 'Complete 2 Introductions first',
    requiresTwoIntros: true,
  },
];

export default function IntroductionOptInScreen() {
  const [selected, setSelected] = useState<OptionKey>('not_now');
  // In a real app this would come from user's intro count
  const introductionsMade = 0;

  function handleEnter() {
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
                  <Text style={[styles.optionTitle, disabled && styles.optionTitleDisabled]}>
                    {opt.title}
                  </Text>
                  <Text style={[styles.optionDescription, disabled && styles.optionDescriptionDisabled]}>
                    {opt.description}
                    {disabled ? '\n(Complete 2 Introductions first)' : ''}
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

        <Pressable style={styles.primaryButton} onPress={handleEnter}>
          <Text style={styles.primaryButtonText}>Enter The Nest</Text>
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
    marginTop: 48,
    marginBottom: 36,
  },
  heading: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FAF7F2',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#edd5a0',
    lineHeight: 24,
  },
  options: {
    gap: 14,
    marginBottom: 36,
  },
  optionCard: {
    backgroundColor: '#4a2a5c',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#62397a',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  optionCardSelected: {
    borderColor: '#e2507a',
    backgroundColor: '#5a2f6e',
  },
  optionCardDisabled: {
    opacity: 0.45,
  },
  optionIcon: {
    fontSize: 28,
    lineHeight: 34,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAF7F2',
    marginBottom: 4,
  },
  optionTitleDisabled: {
    color: '#c49fd5',
  },
  optionDescription: {
    fontSize: 14,
    color: '#edd5a0',
    lineHeight: 20,
  },
  optionDescriptionDisabled: {
    color: '#c49fd5',
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2507a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    fontSize: 14,
    color: '#FAF7F2',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#e2507a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAF7F2',
  },
});
