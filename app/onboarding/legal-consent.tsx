import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

const CONSENTS = [
  {
    title: 'Terms of Use',
    summary:
      'By using Introduced, you agree to use this platform with respect, honesty, and care for others. You take responsibility for your actions and interactions within the app.',
    linkLabel: 'View full Terms',
  },
  {
    title: 'Privacy Policy',
    summary:
      'Your data is yours. We collect only what is needed to make Introduced work, and we will never sell your personal information. You may request deletion of your data at any time.',
    linkLabel: 'View full Privacy Policy',
  },
  {
    title: 'Community Guidelines',
    summary:
      'Introduced is a space for genuine connection. Harassment, spam, explicit content, and dishonesty are not welcome here. Violations may result in removal from the platform.',
    linkLabel: 'View full Guidelines',
  },
  {
    title: 'Introduction Disclaimer',
    summary:
      'Introduced helps people connect through trusted introductions. We do not guarantee relationship outcomes. You are responsible for your interactions. Please stay safe.',
    linkLabel: 'View full Disclaimer',
  },
];

export default function LegalConsentScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const consent = CONSENTS[currentIndex];
  const isLast = currentIndex === CONSENTS.length - 1;

  function handleScroll(event: any) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isBottom) setScrolledToBottom(true);
  }

  function handleAgree() {
    if (isLast) {
      router.push('/onboarding/create-identity');
    } else {
      setCurrentIndex((i) => i + 1);
      setScrolledToBottom(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressRow}>
        {CONSENTS.map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, i === currentIndex && styles.progressDotActive, i < currentIndex && styles.progressDotDone]}
          />
        ))}
      </View>
      <Text style={styles.progressLabel}>
        {currentIndex + 1} of {CONSENTS.length}
      </Text>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.heading}>{consent.title}</Text>
        <Text style={styles.summary}>{consent.summary}</Text>

        <Pressable onPress={() => Alert.alert('Coming soon', `${consent.linkLabel} will be available before public launch.`)}>
          <Text style={styles.viewFullLink}>{consent.linkLabel}</Text>
        </Pressable>

        <Text style={styles.mvpNote}>
          These documents are placeholders for MVP. Please consult an attorney before public launch.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.primaryButton, !scrolledToBottom && styles.primaryButtonDisabled]}
          onPress={handleAgree}
          disabled={!scrolledToBottom}
        >
          <Text style={styles.primaryButtonText}>
            {isLast ? 'I Agree — Continue' : 'I Agree'}
          </Text>
        </Pressable>
        {!scrolledToBottom && (
          <Text style={styles.scrollHint}>Scroll to read before agreeing</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D1B35',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 24,
    paddingBottom: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#62397a',
  },
  progressDotActive: {
    backgroundColor: '#e2507a',
    width: 24,
  },
  progressDotDone: {
    backgroundColor: '#ae7ec6',
  },
  progressLabel: {
    fontSize: 13,
    color: '#c49fd5',
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FAF7F2',
    marginBottom: 20,
  },
  summary: {
    fontSize: 16,
    color: '#edd5a0',
    lineHeight: 26,
    marginBottom: 24,
  },
  viewFullLink: {
    fontSize: 14,
    color: '#e2507a',
    marginBottom: 32,
    textDecorationLine: 'underline',
  },
  mvpNote: {
    fontSize: 11,
    color: '#c49fd5',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#62397a',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#e2507a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAF7F2',
  },
  scrollHint: {
    fontSize: 12,
    color: '#c49fd5',
    textAlign: 'center',
  },
});
