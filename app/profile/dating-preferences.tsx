import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

const OPEN_TO_OPTIONS = [
  { key: 'friendship',   label: 'Building a real friendship first',  icon: '🤝' },
  { key: 'dating',       label: 'Dating and seeing where it goes',    icon: '✨' },
  { key: 'relationship', label: 'A committed relationship',           icon: '💛' },
  { key: 'both',         label: 'Open to friendship or dating',       icon: '✦' },
  { key: 'not_sure',     label: "I'm not sure yet",                   icon: '🌿' },
];

const PACE_OPTIONS = [
  { key: 'slow',    label: 'Slow and intentional',    sub: 'I like to build a foundation first' },
  { key: 'natural', label: 'Natural',                 sub: 'Wherever it flows' },
  { key: 'steady',  label: 'Steady',                  sub: 'Consistent effort from both sides' },
  { key: 'direct',  label: 'Direct',                  sub: 'I know what I want' },
];

const NON_NEGOTIABLES = [
  { key: 'honesty',                label: 'Honesty' },
  { key: 'emotional_availability', label: 'Emotional availability' },
  { key: 'ambition',               label: 'Drive and ambition' },
  { key: 'kindness',               label: 'Genuine kindness' },
  { key: 'humor',                  label: 'A good sense of humor' },
  { key: 'faith',                  label: 'Shared faith or values' },
  { key: 'family_oriented',        label: 'Family-oriented' },
  { key: 'independence',           label: 'Respects independence' },
];

export default function ProfileDatingPreferencesScreen() {
  const { appUser } = useAuthStore();
  const [openTo, setOpenTo] = useState('both');
  const [pace, setPace] = useState('natural');
  const [nonNegotiables, setNonNegotiables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    if (!appUser?.id) return;
    const { data } = await supabase
      .from('dating_preferences')
      .select('open_to, relationship_pace, non_negotiables')
      .eq('user_id', appUser.id)
      .single();
    if (data) {
      setOpenTo(data.open_to ?? 'both');
      setPace(data.relationship_pace ?? 'natural');
      setNonNegotiables(data.non_negotiables ?? []);
    }
    setLoading(false);
  }

  function toggleNN(key: string) {
    setNonNegotiables((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function save() {
    if (!appUser?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('dating_preferences')
      .upsert({
        user_id: appUser.id,
        open_to: openTo,
        relationship_pace: pace,
        non_negotiables: nonNegotiables,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) {
      Alert.alert('Error', 'Could not save. Please try again.');
    } else {
      router.back();
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blush[500]} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What are you open to right now?</Text>
        <View style={styles.optionList}>
          {OPEN_TO_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.optionCard, openTo === opt.key && styles.optionCardSelected]}
              onPress={() => setOpenTo(opt.key)}
            >
              <Text style={styles.optionIcon}>{opt.icon}</Text>
              <Text style={[styles.optionLabel, openTo === opt.key && styles.optionLabelSelected]}>
                {opt.label}
              </Text>
              {openTo === opt.key && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Relationship pace</Text>
        <View style={styles.optionList}>
          {PACE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.optionCard, pace === opt.key && styles.optionCardSelected]}
              onPress={() => setPace(opt.key)}
            >
              <View style={styles.paceText}>
                <Text style={[styles.optionLabel, pace === opt.key && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionSub}>{opt.sub}</Text>
              </View>
              {pace === opt.key && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Non-negotiables</Text>
        <Text style={styles.sectionHint}>Select everything that matters most to you</Text>
        <View style={styles.chipGrid}>
          {NON_NEGOTIABLES.map((item) => {
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
      </View>

      <Pressable
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={save}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color={Colors.ivory} />
          : <Text style={styles.saveBtnText}>Save Preferences</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: Colors.plum[300],
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  sectionHint: { fontSize: 13, color: Colors.plum[400] },
  optionList: { gap: 8 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.plum[800], borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.plum[700], padding: 14, gap: 10,
  },
  optionCardSelected: { borderColor: Colors.blush[500], backgroundColor: 'rgba(226,80,122,0.08)' },
  optionIcon: { fontSize: 18 },
  paceText: { flex: 1 },
  optionLabel: { fontSize: 15, color: Colors.plum[200], fontWeight: '500' },
  optionLabelSelected: { color: Colors.ivory, fontWeight: '600' },
  optionSub: { fontSize: 12, color: Colors.plum[500], marginTop: 2 },
  checkmark: { fontSize: 15, color: Colors.blush[500], marginLeft: 'auto' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: Colors.plum[800], borderWidth: 1, borderColor: Colors.plum[700],
  },
  chipSelected: { backgroundColor: Colors.blush[500], borderColor: Colors.blush[500] },
  chipText: { fontSize: 14, color: Colors.plum[400] },
  chipTextSelected: { color: Colors.ivory, fontWeight: '600' },
  saveBtn: {
    backgroundColor: Colors.blush[500], borderRadius: 24,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: Colors.ivory, fontWeight: '700', fontSize: 16 },
});
