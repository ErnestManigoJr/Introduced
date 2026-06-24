import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface UserResult {
  id: string;
  display_name: string;
  username: string;
}

export default function SuggestScreen() {
  const { appUser } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [personA, setPersonA] = useState<UserResult | null>(null);
  const [personB, setPersonB] = useState<UserResult | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function search(q: string) {
    setSearching(true);
    const { data } = await supabase
      .from('app_users')
      .select('id, display_name, username')
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq('id', appUser?.id ?? '')
      .limit(20);
    setResults((data as UserResult[]) ?? []);
    setSearching(false);
  }

  function selectPerson(user: UserResult) {
    if (step === 1) {
      setPersonA(user);
      setStep(2);
      setQuery('');
      setResults([]);
    } else {
      if (user.id === personA?.id) {
        Alert.alert('Same person', 'Please choose two different people.');
        return;
      }
      setPersonB(user);
    }
  }

  function proceed() {
    if (!personA || !personB) return;
    router.push(`/introduce/compose?personAId=${personA.id}&personAName=${encodeURIComponent(personA.display_name)}&personBId=${personB.id}&personBName=${encodeURIComponent(personB.display_name)}`);
  }

  const excludeId = step === 2 ? personA?.id : undefined;

  return (
    <View style={styles.container}>
      {/* Step indicator */}
      <View style={styles.steps}>
        <StepDot n={1} active={step === 1} done={!!personA} />
        <View style={styles.stepLine} />
        <StepDot n={2} active={step === 2} done={!!personB} />
      </View>

      {/* Selection preview */}
      <View style={styles.preview}>
        <PersonSlot label="Person A" person={personA} onClear={step === 1 ? undefined : () => { setPersonA(null); setPersonB(null); setStep(1); }} />
        <Text style={styles.previewConnector}>✦</Text>
        <PersonSlot label="Person B" person={personB} onClear={personB ? () => { setPersonB(null); setStep(2); } : undefined} />
      </View>

      {(!personA || !personB) && (
        <>
          <Text style={styles.prompt}>
            {step === 1 ? 'Search for the first person' : `Now search for someone to introduce to ${personA?.display_name}`}
          </Text>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or @username"
              placeholderTextColor={Colors.plum[400]}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searching && <ActivityIndicator size="small" color={Colors.blush[500]} style={{ marginRight: 12 }} />}
          </View>

          <FlatList
            data={results.filter(r => r.id !== excludeId)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable style={styles.resultRow} onPress={() => selectPerson(item)}>
                <View style={styles.resultAvatar}>
                  <Text style={styles.resultInitial}>{item.display_name[0]?.toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.resultName}>{item.display_name}</Text>
                  <Text style={styles.resultUsername}>@{item.username}</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              query.length >= 2 && !searching ? (
                <Text style={styles.noResults}>No results for "{query}"</Text>
              ) : null
            }
          />
        </>
      )}

      {personA && personB && (
        <View style={styles.readySection}>
          <Text style={styles.readyText}>
            You're about to introduce {personA.display_name} and {personB.display_name}.
          </Text>
          <Pressable style={styles.nextBtn} onPress={proceed}>
            <Text style={styles.nextBtnText}>Write Introduction →</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
      <Text style={[styles.stepDotText, (active || done) && styles.stepDotTextActive]}>
        {done ? '✓' : n}
      </Text>
    </View>
  );
}

function PersonSlot({ label, person, onClear }: { label: string; person: UserResult | null; onClear?: () => void }) {
  return (
    <View style={styles.slot}>
      <View style={[styles.slotAvatar, person && styles.slotAvatarFilled]}>
        <Text style={styles.slotInitial}>
          {person ? person.display_name[0]?.toUpperCase() : '?'}
        </Text>
      </View>
      <Text style={styles.slotName} numberOfLines={1}>
        {person ? person.display_name : label}
      </Text>
      {onClear && (
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={styles.clearBtn}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 0 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.plum[800],
    borderWidth: 2, borderColor: Colors.plum[600],
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { borderColor: Colors.blush[500] },
  stepDotDone: { backgroundColor: Colors.blush[500], borderColor: Colors.blush[500] },
  stepDotText: { fontSize: 13, fontWeight: '700', color: Colors.plum[400] },
  stepDotTextActive: { color: Colors.ivory },
  stepLine: { width: 40, height: 2, backgroundColor: Colors.plum[700] },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  previewConnector: { fontSize: 22, color: Colors.champagne[400] },
  slot: { flex: 1, alignItems: 'center', gap: 4 },
  slotAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.plum[800],
    borderWidth: 2, borderColor: Colors.plum[600],
    alignItems: 'center', justifyContent: 'center',
  },
  slotAvatarFilled: { borderColor: Colors.blush[500] },
  slotInitial: { fontSize: 20, fontWeight: '700', color: Colors.plum[400] },
  slotName: { fontSize: 12, color: Colors.plum[300], textAlign: 'center', maxWidth: 100 },
  clearBtn: { fontSize: 12, color: Colors.plum[500], marginTop: 2 },
  prompt: { fontSize: 14, color: Colors.plum[300], paddingHorizontal: 20, marginBottom: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.ivory,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
  },
  resultAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.plum[700],
    borderWidth: 1.5, borderColor: Colors.blush[500],
    alignItems: 'center', justifyContent: 'center',
  },
  resultInitial: { fontSize: 16, fontWeight: '700', color: Colors.blush[400] },
  resultName: { fontSize: 15, fontWeight: '600', color: Colors.ivory },
  resultUsername: { fontSize: 12, color: Colors.plum[400] },
  noResults: { textAlign: 'center', color: Colors.plum[500], paddingTop: 40, fontSize: 14 },
  readySection: { flex: 1, padding: 24, alignItems: 'center', gap: 20 },
  readyText: { fontSize: 16, color: Colors.plum[200], textAlign: 'center', lineHeight: 24 },
  nextBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  nextBtnText: { color: Colors.ivory, fontWeight: '700', fontSize: 16 },
});
