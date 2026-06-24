import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
} from 'react-native';
import { router } from 'expo-router';

type VisibilityOption = 'Public' | 'Connections Only' | 'Private';
type SearchOption = 'Everyone' | 'Hidden';
type MessagesOption = 'Everyone' | 'Connections only';
type LocationOption = 'City' | 'Region' | 'Hidden';

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={scStyles.container}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          style={[scStyles.option, value === opt && scStyles.optionActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[scStyles.optionText, value === opt && scStyles.optionTextActive]}>
            {opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const scStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#4a2a5c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#62397a',
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: '#e2507a',
  },
  optionText: {
    fontSize: 13,
    color: '#c49fd5',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#FAF7F2',
    fontWeight: '600',
  },
});

export default function PrivacyPreferencesScreen() {
  const [visibility, setVisibility] = useState<VisibilityOption>('Public');
  const [searchVisibility, setSearchVisibility] = useState<SearchOption>('Everyone');
  const [messages, setMessages] = useState<MessagesOption>('Everyone');
  const [showOnline, setShowOnline] = useState(true);
  const [locationPref, setLocationPref] = useState<LocationOption>('City');

  function handleContinue() {
    router.push('/onboarding/introduction-opt-in');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.heading}>Your privacy, your rules.</Text>
          <Text style={styles.subtitle}>
            Control who can see you and how you can be reached.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.rowLabel}>Profile Visibility</Text>
          <Text style={styles.rowDescription}>Who can view your full profile</Text>
          <SegmentedControl
            options={['Public', 'Connections Only', 'Private']}
            value={visibility}
            onChange={(v) => setVisibility(v as VisibilityOption)}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.rowLabel}>Search Visibility</Text>
          <Text style={styles.rowDescription}>Who can find you in search</Text>
          <SegmentedControl
            options={['Everyone', 'Hidden']}
            value={searchVisibility}
            onChange={(v) => setSearchVisibility(v as SearchOption)}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.rowLabel}>Open to messages from</Text>
          <Text style={styles.rowDescription}>Who can send you direct messages</Text>
          <SegmentedControl
            options={['Everyone', 'Connections only']}
            value={messages}
            onChange={(v) => setMessages(v as MessagesOption)}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowLabel}>Show online status</Text>
            <Text style={styles.rowDescription}>Let others see when you're active</Text>
          </View>
          <Switch
            value={showOnline}
            onValueChange={setShowOnline}
            trackColor={{ false: '#62397a', true: '#e2507a' }}
            thumbColor="#FAF7F2"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.rowLabel}>Show location</Text>
          <Text style={styles.rowDescription}>How precisely to share your location</Text>
          <SegmentedControl
            options={['City', 'Region', 'Hidden']}
            value={locationPref}
            onChange={(v) => setLocationPref(v as LocationOption)}
          />
        </View>

        <Pressable style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>Continue</Text>
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
    fontSize: 34,
    fontWeight: '700',
    color: '#FAF7F2',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#edd5a0',
    lineHeight: 24,
  },
  section: {
    gap: 8,
    paddingVertical: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAF7F2',
  },
  rowDescription: {
    fontSize: 13,
    color: '#c49fd5',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#62397a',
  },
  primaryButton: {
    backgroundColor: '#e2507a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAF7F2',
  },
});
