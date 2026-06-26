import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

export default function ComposeScreen() {
  const { appUser } = useAuthStore();
  const params = useLocalSearchParams<{
    personAId: string;
    personAName: string;
    personBId: string;
    personBName: string;
  }>();

  const personAName = decodeURIComponent(params.personAName ?? '');
  const personBName = decodeURIComponent(params.personBName ?? '');

  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!appUser?.id || !params.personAId || !params.personBId) return;

    // Guard: cannot introduce yourself as Person A or B
    if (params.personAId === appUser.id || params.personBId === appUser.id) {
      Alert.alert('Invalid Introduction', 'You cannot introduce yourself to someone else.');
      return;
    }

    // Guard: Person A and B must be different people
    if (params.personAId === params.personBId) {
      Alert.alert('Invalid Introduction', 'Person A and Person B must be different people.');
      return;
    }

    if (!appUser.connection_style_complete) {
      Alert.alert(
        'Connection Style Required',
        'Complete your Connection Style before making introductions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete Now', onPress: () => router.push('/onboarding/connection-style') },
        ]
      );
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase
      .from('introductions')
      .insert({
        connector_id: appUser.id,
        person_a_id: params.personAId,
        person_b_id: params.personBId,
        note: note.trim() || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      Alert.alert('Error', 'Could not send introduction. Please try again.');
      setSubmitting(false);
      return;
    }

    // Update introductions_made count
    await supabase
      .from('app_users')
      .update({ introductions_made: (appUser.introductions_made ?? 0) + 1 })
      .eq('id', appUser.id);

    setSubmitting(false);
    router.replace(`/introduce/${data.id}?sent=true`);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Who's being introduced */}
        <View style={styles.introPreview}>
          <Avatar name={personAName} />
          <View style={styles.introCenter}>
            <Text style={styles.introConnector}>✦</Text>
            <Text style={styles.introBy}>by you</Text>
          </View>
          <Avatar name={personBName} />
        </View>
        <Text style={styles.introNames}>
          {personAName} & {personBName}
        </Text>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Why should they meet?</Text>
          <Text style={styles.sectionHint}>
            A personal note helps both people feel comfortable accepting. Optional but encouraged.
          </Text>
          <TextInput
            style={styles.noteInput}
            placeholder={`E.g. "You two both love building things from scratch and have the same kind of relentless energy. I think you'd really enjoy knowing each other."`}
            placeholderTextColor={Colors.plum[500]}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={400}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{note.length}/400</Text>
        </View>

        {/* What happens next */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens next</Text>
          <InfoRow icon="1" text={`${personAName} receives your introduction request`} />
          <InfoRow icon="2" text="If they accept, the introduction is sent to both parties" />
          <InfoRow icon="3" text="When both accept, a shared conversation opens" />
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.ivory} />
          ) : (
            <Text style={styles.submitBtnText}>Send Introduction</Text>
          )}
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <View style={styles.avatarWrap}>
      <View style={styles.avatar}>
        <Text style={styles.avatarInitial}>{name[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <Text style={styles.avatarName} numberOfLines={1}>{name}</Text>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Text style={styles.infoIconText}>{icon}</Text>
      </View>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 24 },
  introPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  introCenter: { alignItems: 'center', gap: 2 },
  introConnector: { fontSize: 24, color: Colors.champagne[400] },
  introBy: { fontSize: 10, color: Colors.plum[500], fontWeight: '500' },
  avatarWrap: { alignItems: 'center', gap: 6, maxWidth: 90 },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.plum[700],
    borderWidth: 2, borderColor: Colors.blush[500],
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 24, fontWeight: '700', color: Colors.blush[400] },
  avatarName: { fontSize: 13, color: Colors.ivory, fontWeight: '600', textAlign: 'center' },
  introNames: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.ivory, marginTop: -8 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: Colors.ivory },
  sectionHint: { fontSize: 13, color: Colors.plum[400], lineHeight: 19 },
  noteInput: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    color: Colors.ivory,
    fontSize: 15,
    padding: 14,
    minHeight: 120,
    lineHeight: 22,
  },
  charCount: { fontSize: 12, color: Colors.plum[500], textAlign: 'right' },
  infoCard: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: Colors.champagne[400], textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.plum[700],
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  infoIconText: { fontSize: 11, fontWeight: '700', color: Colors.champagne[400] },
  infoText: { flex: 1, fontSize: 14, color: Colors.plum[300], lineHeight: 20 },
  submitBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: Colors.ivory, fontWeight: '700', fontSize: 16 },
});
