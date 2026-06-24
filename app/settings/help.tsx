import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

const FAQS = [
  {
    q: 'How do I unlock introductions?',
    a: 'You must make 2 introductions to others before you become "Open to Introductions" yourself. This ensures the community stays active and reciprocal.',
  },
  {
    q: 'What is a Connection Style?',
    a: 'A short quiz that captures your personality and social preferences. It powers the signal score shown on each introduction, helping connectors make better matches.',
  },
  {
    q: 'How does the Connector Profile work?',
    a: 'Connector Profiles let you build a public matchmaker identity. Your introduction track record is visible, and sponsors can pay to appear on your intro cards.',
  },
  {
    q: 'What happens after both people accept?',
    a: 'A direct conversation thread opens between you and the other person. You can also join an Intro Room for a live video call.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Email support@introduced.app and we\'ll permanently delete your data within 30 days per our privacy policy.',
  },
];

export default function HelpScreen() {
  const { appUser } = useAuthStore();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);

  async function sendFeedback() {
    if (!feedback.trim()) return;
    setSending(true);
    const { error } = await supabase.from('feedback').insert({
      user_id: appUser?.id ?? null,
      body: feedback.trim(),
    });
    setSending(false);
    if (error) {
      Alert.alert('Error', 'Could not send feedback. Try emailing us directly.');
    } else {
      setFeedback('');
      Alert.alert('Thanks!', 'Your feedback has been received.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.sectionHeader}>FAQ</Text>
      <View style={styles.card}>
        {FAQS.map((faq, i) => (
          <Pressable
            key={i}
            style={[styles.faqRow, i < FAQS.length - 1 && styles.rowBorder]}
            onPress={() => setExpanded(expanded === i ? null : i)}
          >
            <View style={styles.faqTop}>
              <Text style={styles.faqQ}>{faq.q}</Text>
              <Text style={styles.faqChevron}>{expanded === i ? '▲' : '▼'}</Text>
            </View>
            {expanded === i && <Text style={styles.faqA}>{faq.a}</Text>}
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionHeader}>Send Feedback</Text>
      <View style={styles.feedbackCard}>
        <TextInput
          style={styles.feedbackInput}
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Tell us what you think or report a bug..."
          placeholderTextColor={Colors.plum[500]}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />
        <Pressable
          style={[styles.sendBtn, (!feedback.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendFeedback}
          disabled={!feedback.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color={Colors.ivory} size="small" />
            : <Text style={styles.sendBtnText}>Send Feedback</Text>}
        </Pressable>
      </View>

      <Text style={styles.sectionHeader}>Contact</Text>
      <View style={styles.card}>
        <Pressable
          style={[styles.contactRow, styles.rowBorder]}
          onPress={() => Linking.openURL('mailto:support@introduced.app')}
        >
          <Text style={styles.contactLabel}>Email Support</Text>
          <Text style={styles.contactArrow}>→</Text>
        </Pressable>
        <Pressable
          style={styles.contactRow}
          onPress={() => Linking.openURL('https://introduced.app/privacy')}
        >
          <Text style={styles.contactLabel}>Privacy Policy</Text>
          <Text style={styles.contactArrow}>→</Text>
        </Pressable>
      </View>

      <Text style={styles.version}>Introduced v1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.plum[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.plum[700] },
  faqRow: { padding: 14, gap: 8 },
  faqTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQ: { fontSize: 15, color: Colors.ivory, fontWeight: '500', flex: 1 },
  faqChevron: { fontSize: 10, color: Colors.plum[400] },
  faqA: { fontSize: 14, color: Colors.plum[300], lineHeight: 21 },
  feedbackCard: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    padding: 14,
    gap: 12,
  },
  feedbackInput: {
    color: Colors.ivory,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 20,
    paddingVertical: 11,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: Colors.ivory, fontWeight: '700', fontSize: 14 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  contactLabel: { fontSize: 15, color: Colors.ivory },
  contactArrow: { fontSize: 16, color: Colors.plum[400] },
  version: { fontSize: 12, color: Colors.plum[600], textAlign: 'center', marginTop: 8 },
});
