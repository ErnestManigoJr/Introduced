import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { INTAKE } from '../../src/constants/copy';
import { Button } from '../../src/components/ui/Button';
import { CONNECTION_STYLE_QUESTIONS } from '../../src/data/connectionStyleQuestions';
import {
  saveIntakeAnswers,
  calculateAndSaveTraitScores,
  markConnectionStyleComplete,
} from '../../src/services/intakeService';
import { useAuthStore } from '../../src/store/authStore';

export default function ConnectionStyleScreen() {
  const { appUser } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const question = CONNECTION_STYLE_QUESTIONS[currentIndex];
  const total    = CONNECTION_STYLE_QUESTIONS.length;
  const progress = (currentIndex + 1) / total;
  const selected = answers[question.key];
  const isLast   = currentIndex === total - 1;

  function selectOption(optionKey: string) {
    setAnswers((prev) => ({ ...prev, [question.key]: optionKey }));
  }

  function animateTransition(callback: () => void) {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }

  function handleNext() {
    if (!selected) return;
    if (isLast) {
      handleComplete();
    } else {
      animateTransition(() => setCurrentIndex((i) => i + 1));
    }
  }

  function handleBack() {
    if (currentIndex === 0) {
      router.back();
    } else {
      animateTransition(() => setCurrentIndex((i) => i - 1));
    }
  }

  async function handleComplete() {
    if (!appUser?.id) return;
    setSaving(true);
    try {
      const { error: saveError } = await saveIntakeAnswers(appUser.id, answers);
      if (saveError) throw new Error(saveError);

      const { error: scoreError } = await calculateAndSaveTraitScores(appUser.id, answers);
      if (scoreError) throw new Error(scoreError);

      await markConnectionStyleComplete(appUser.id);
      setDone(true);
    } catch (e: any) {
      Alert.alert('Something went wrong', e.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return <CompletionScreen onContinue={() => router.replace('/(tabs)/introduce')} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{INTAKE.progress(currentIndex + 1, total)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Category chip */}
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{question.categoryLabel}</Text>
          </View>

          {/* Question */}
          <Text style={styles.questionText}>{question.prompt}</Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {question.options.map((option) => {
              const isSelected = selected === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => selectOption(option.key)}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                    {isSelected && <View style={styles.optionRadioInner} />}
                  </View>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          label={isLast ? INTAKE.complete : INTAKE.next}
          onPress={handleNext}
          disabled={!selected}
          loading={saving}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

function CompletionScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.completionContainer}>
        <View style={styles.completionIcon}>
          <Text style={styles.completionEmoji}>✦</Text>
        </View>
        <Text style={styles.completionHeadline}>{INTAKE.completeHeadline}</Text>
        <Text style={styles.completionBody}>{INTAKE.completeBody}</Text>
        <View style={styles.completionFooter}>
          <Button
            label={INTAKE.completeAction}
            onPress={onContinue}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 22,
    color: Colors.ivory,
  },
  progressContainer: {
    flex: 1,
    gap: 6,
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
  progressText: {
    fontSize: 11,
    color: Colors.plum[300],
    textAlign: 'right',
    fontWeight: '500',
  },

  // Content
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 120,
  },

  // Category chip
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.plum[700],
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.champagne[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Question
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ivory,
    lineHeight: 32,
    marginBottom: 28,
  },

  // Options
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.plum[700],
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  optionSelected: {
    borderColor: Colors.blush[500],
    backgroundColor: 'rgba(226, 80, 122, 0.08)',
  },
  optionPressed: {
    opacity: 0.8,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.plum[500],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionRadioSelected: {
    borderColor: Colors.blush[500],
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.blush[500],
  },
  optionLabel: {
    fontSize: 15,
    color: Colors.plum[200],
    flex: 1,
    lineHeight: 22,
  },
  optionLabelSelected: {
    color: Colors.ivory,
    fontWeight: '500',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 16,
    backgroundColor: Theme.background,
    borderTopWidth: 1,
    borderTopColor: Colors.plum[800],
  },

  // Completion
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  completionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.plum[800],
    borderWidth: 1.5,
    borderColor: Colors.blush[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  completionEmoji: {
    fontSize: 32,
    color: Colors.champagne[400],
  },
  completionHeadline: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.ivory,
    textAlign: 'center',
    lineHeight: 32,
  },
  completionBody: {
    fontSize: 16,
    color: Colors.plum[300],
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  completionFooter: {
    width: '100%',
    marginTop: 16,
  },
});
