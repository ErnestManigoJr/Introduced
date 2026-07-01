import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { Colors, Theme } from '../../src/constants/colors';

const ONBOARDING_STEP = 5;
const ONBOARDING_TOTAL = 6;

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
  const { appUser } = useAuthStore();
  const [visibility, setVisibility] = useState<VisibilityOption>('Public');
  const [searchVisibility, setSearchVisibility] = useState<SearchOption>('Everyone');
  const [messages, setMessages] = useState<MessagesOption>('Everyone');
  const [showOnline, setShowOnline] = useState(true);
  const [locationPref, setLocationPref] = useState<LocationOption>('City');
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    if (appUser?.id) {
      setSaving(true);
      // Map UI labels to DB enum values
      const visibilityMap: Record<string, string> = {
        'Public': 'public',
        'Connections Only': 'connections',
        'Private': 'private',
      };
      const searchMap: Record<string, string> = {
        'Everyone': 'everyone',
        'Hidden': 'hidden',
      };
      const messageMap: Record<string, string> = {
        'Everyone': 'everyone',
        'Connections only': 'connections',
      };
      const locationMap: Record<string, string> = {
        'City': 'city',
        'Region': 'region',
        'Hidden': 'hidden',
      };

      await supabase.from('privacy_settings').upsert({
        user_id: appUser.id,
        profile_visibility: visibilityMap[visibility] ?? 'public',
        search_visibility: searchMap[searchVisibility] ?? 'everyone',
        message_request_policy: messageMap[messages] ?? 'everyone',
        show_online_status: showOnline,
        show_location_level: locationMap[locationPref] ?? 'city',
        introduction_visibility: 'open',
        reshare_policy: 'allow',
        open_to_introductions: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setSaving(false);
    }
    router.push('/onboarding/dating-preferences');
  }

  return (
    <SafeAreaView style={styles.container}>
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

        <Pressable style={[styles.primaryButton, saving && { opacity: 0.6 }]} onPress={handleContinue} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#FAF7F2" />
            : <Text style={styles.primaryButtonText}>Continue</Text>}
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  header: {
    marginTop: 32,
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

