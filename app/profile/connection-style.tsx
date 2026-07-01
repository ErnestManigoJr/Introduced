import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import {
  CONNECTION_STYLES,
  ConnectionStyleDef,
  getTraitScores,
} from '../../src/services/intakeService';
import { useAuthStore } from '../../src/store/authStore';
import { TraitKey } from '../../src/data/connectionStyleQuestions';

const TRAIT_DISPLAY_PAIRS: { label: string; a: TraitKey; b: TraitKey }[] = [
  { label: 'Social Energy', a: 'social_energy', b: 'alone_recharge' },
  { label: 'Decision Style', a: 'decision_logic', b: 'decision_feeling' },
  { label: 'Planning', a: 'planning_preference', b: 'spontaneity' },
  { label: 'Focus', a: 'detail_orientation', b: 'big_picture_orientation' },
  { label: 'Communication', a: 'analytical_style', b: 'empathetic_style' },
  { label: 'Thinking', a: 'concrete_thinking', b: 'abstract_thinking' },
  { label: 'Emotion', a: 'emotional_expression', b: 'emotional_privacy' },
  { label: 'Structure', a: 'structure_preference', b: 'flexibility_preference' },
];

export default function ProfileConnectionStyleScreen() {
  const { appUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<TraitKey, number> | null>(null);
  const styleDef = CONNECTION_STYLES.find((s) => s.key === appUser?.connection_style) ?? null;

  useEffect(() => {
    if (!appUser?.id) return;
    getTraitScores(appUser.id).then(({ scores: s }) => {
      setScores(s);
      setLoading(false);
    });
  }, [appUser?.id]);

  if (!styleDef) {
    // No style yet — send them to the quiz
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Connection Style yet</Text>
          <Text style={styles.emptyBody}>
            Complete the quiz to discover your style and unlock better introductions.
          </Text>
          <Pressable
            style={styles.ctaButton}
            onPress={() => router.replace('/onboarding/connection-style')}
          >
            <Text style={styles.ctaButtonText}>Take the Quiz</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>✦</Text>
          </View>
          <Text style={styles.eyebrow}>Your Connection Style</Text>
          <Text style={styles.headline}>{styleDef.label}</Text>
          <Text style={styles.tagline}>{styleDef.tagline}</Text>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardText}>{styleDef.description}</Text>
        </View>

        {/* Strengths */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Strengths</Text>
          <View style={styles.pillRow}>
            {styleDef.strengths.map((s) => (
              <View key={s} style={styles.pill}>
                <Text style={styles.pillText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Growth edge */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Growth Edge</Text>
          <View style={styles.growthCard}>
            <Text style={styles.growthText}>{styleDef.growthEdge}</Text>
          </View>
        </View>

        {/* Trait spectrum bars */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Trait Spectrum</Text>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.blush[500]} style={{ marginTop: 12 }} />
          ) : scores ? (
            <View style={styles.traitList}>
              {TRAIT_DISPLAY_PAIRS.map((pair) => {
                const aScore = scores[pair.a] ?? 0; // -1 to 1
                const bScore = scores[pair.b] ?? 0;
                // Normalize to 0-100 where 50 = neutral
                const position = Math.round(((aScore - bScore) / 2 + 0.5) * 100);
                const clamped = Math.max(0, Math.min(100, position));
                return (
                  <TraitBar
                    key={pair.label}
                    label={pair.label}
                    leftLabel={pair.a.split('_').slice(-1)[0]}
                    rightLabel={pair.b.split('_').slice(-1)[0]}
                    position={clamped}
                  />
                );
              })}
            </View>
          ) : null}
        </View>

        {/* Retake */}
        <Pressable
          style={styles.retakeButton}
          onPress={() => router.push('/onboarding/connection-style')}
        >
          <Text style={styles.retakeText}>Retake Quiz</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function TraitBar({
  label,
  leftLabel,
  rightLabel,
  position,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  position: number; // 0-100
}) {
  return (
    <View style={traitStyles.row}>
      <Text style={traitStyles.label}>{label}</Text>
      <View style={traitStyles.barRow}>
        <Text style={traitStyles.sideLabel} numberOfLines={1}>{leftLabel}</Text>
        <View style={traitStyles.track}>
          <View style={[traitStyles.fill, { width: `${position}%` as any }]} />
          <View style={[traitStyles.thumb, { left: `${position}%` as any, marginLeft: -8 }]} />
        </View>
        <Text style={[traitStyles.sideLabel, { textAlign: 'right' }]} numberOfLines={1}>{rightLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ivory,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    color: Colors.plum[300],
    textAlign: 'center',
    lineHeight: 22,
  },
  ctaButton: {
    marginTop: 8,
    backgroundColor: Colors.blush[500],
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ivory,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.plum[800],
    borderWidth: 1.5,
    borderColor: Colors.blush[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroIconText: {
    fontSize: 24,
    color: Colors.champagne[400],
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.champagne[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.ivory,
    textAlign: 'center',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: Colors.plum[300],
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Cards & sections
  card: {
    backgroundColor: Colors.plum[800],
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    marginBottom: 20,
  },
  cardText: {
    fontSize: 15,
    color: Colors.champagne[200],
    lineHeight: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.plum[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: 'rgba(226, 80, 122, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.blush[500],
  },
  pillText: {
    fontSize: 13,
    color: Colors.blush[400],
    fontWeight: '500',
  },
  growthCard: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.champagne[400],
  },
  growthText: {
    fontSize: 14,
    color: Colors.champagne[300],
    lineHeight: 22,
  },
  traitList: {
    gap: 16,
  },
  retakeButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.plum[700],
    borderRadius: 12,
  },
  retakeText: {
    fontSize: 14,
    color: Colors.plum[300],
    fontWeight: '500',
  },
});

const traitStyles = StyleSheet.create({
  row: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.plum[300],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideLabel: {
    fontSize: 11,
    color: Colors.plum[400],
    width: 54,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.plum[700],
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.blush[500],
    borderRadius: 3,
    opacity: 0.4,
  },
  thumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.blush[500],
    borderWidth: 2,
    borderColor: Colors.ivory,
  },
});
