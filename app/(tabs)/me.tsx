import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/lib/supabase';

const CONNECTION_STYLE_LABELS: Record<string, string> = {
  expansive_connector: 'Expansive Connector',
  selective_deepener: 'Selective Deepener',
  intentional_bridge: 'Intentional Bridge',
  quiet_cultivator: 'Quiet Cultivator',
  reciprocal_anchor: 'Reciprocal Anchor',
};

export default function MeScreen() {
  const { appUser, connectionStyleComplete, signOut } = useAuthStore();
  const [signingOut, setSigningOut] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  // Load avatar from profiles table on mount
  React.useEffect(() => {
    if (!appUser?.id) return;
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', appUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
  }, [appUser?.id]);

  const introsMade = appUser?.introductions_made ?? 0;
  const isOpen = introsMade >= 2;

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          router.replace('/auth/sign-in');
        },
      },
    ]);
  }

  const initial = appUser?.display_name?.[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Me</Text>
        <Pressable onPress={() => router.push('/profile/edit')} style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar + name */}
        <View style={styles.profileSection}>
          <Pressable onPress={() => router.push('/profile/edit')} style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                onLoad={() => setAvatarLoaded(true)}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </Pressable>
          <Text style={styles.displayName}>{appUser?.display_name ?? '—'}</Text>
          <Text style={styles.username}>@{appUser?.username ?? '—'}</Text>
          {appUser?.bio ? (
            <Text style={styles.bio}>{appUser.bio}</Text>
          ) : (
            <Pressable onPress={() => router.push('/profile/edit')}>
              <Text style={styles.bioPlaceholder}>Add a bio →</Text>
            </Pressable>
          )}
        </View>

        {/* Open to Introductions status */}
        <View style={[styles.statusCard, isOpen && styles.statusCardOpen]}>
          <View style={styles.statusCardLeft}>
            <Text style={styles.statusCardLabel}>
              {isOpen ? '✦ Open to Introductions' : 'Not yet open to introductions'}
            </Text>
            <Text style={styles.statusCardSub}>
              {isOpen
                ? 'People can introduce you to others in their network'
                : `Make ${2 - introsMade} more introduction${introsMade === 1 ? '' : 's'} to unlock`}
            </Text>
          </View>
          <View style={styles.progressDots}>
            {[0, 1].map((i) => (
              <View key={i} style={[styles.dot, i < introsMade && styles.dotFilled]} />
            ))}
          </View>
        </View>

        {/* Connection Style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Style</Text>
          {connectionStyleComplete && appUser?.connection_style ? (
            <Pressable
              style={styles.csCard}
              onPress={() => router.push('/profile/connection-style')}
            >
              <Text style={styles.csName}>
                {CONNECTION_STYLE_LABELS[appUser.connection_style] ?? appUser.connection_style}
              </Text>
              <Text style={styles.csArrow}>→</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.csCardIncomplete}
              onPress={() => router.push('/onboarding/connection-style')}
            >
              <Text style={styles.csIncompleteText}>✦ Complete your Connection Style</Text>
              <Text style={styles.csArrow}>→</Text>
            </Pressable>
          )}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.statsRow}>
            <StatBox label="Introductions Made" value={introsMade} />
            <StatBox label="Connections" value={appUser?.connections_count ?? 0} />
          </View>
        </View>

        {/* Connector CTA — shown if not already set up */}
        <View style={styles.section}>
          <Pressable
            style={styles.connectorCta}
            onPress={() => router.push('/profile/connector-setup')}
          >
            <View>
              <Text style={styles.connectorCtaTitle}>Become a Connector</Text>
              <Text style={styles.connectorCtaSub}>Set up your connector profile and start making matches</Text>
            </View>
            <Text style={styles.connectorCtaArrow}>✦</Text>
          </Pressable>
        </View>

        {/* Settings links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <SettingsRow label="Notification Preferences" onPress={() => router.push('/settings/notifications')} />
          <SettingsRow label="Privacy" onPress={() => router.push('/settings/privacy')} />
          <SettingsRow label="Help & Feedback" onPress={() => router.push('/settings/help')} />
        </View>

        {/* Sign out */}
        <Pressable onPress={handleSignOut} style={styles.signOutBtn} disabled={signingOut}>
          {signingOut ? (
            <ActivityIndicator size="small" color={Colors.blush[400]} />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingsRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.settingsRow}>
      <Text style={styles.settingsRowText}>{label}</Text>
      <Text style={styles.settingsRowArrow}>›</Text>
    </Pressable>
  );
}

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.ivory },
  editBtn: {
    borderWidth: 1,
    borderColor: Colors.plum[600],
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 13, color: Colors.plum[300], fontWeight: '500' },
  scroll: { paddingBottom: 40 },
  profileSection: { alignItems: 'center', paddingTop: 28, paddingBottom: 24, paddingHorizontal: 24 },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginBottom: 14,
    borderWidth: 2.5,
    borderColor: Colors.blush[500],
    overflow: 'hidden',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.plum[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.blush[400] },
  displayName: { fontSize: 22, fontWeight: '700', color: Colors.ivory, marginBottom: 2 },
  username: { fontSize: 14, color: Colors.plum[400], marginBottom: 10 },
  bio: { fontSize: 15, color: Colors.plum[300], textAlign: 'center', lineHeight: 22 },
  bioPlaceholder: { fontSize: 14, color: Colors.blush[400] },
  statusCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.plum[700],
    marginBottom: 8,
  },
  statusCardOpen: { borderColor: Colors.blush[500] },
  statusCardLeft: { flex: 1, marginRight: 12 },
  statusCardLabel: { fontSize: 14, color: Colors.champagne[400], fontWeight: '600', marginBottom: 3 },
  statusCardSub: { fontSize: 12, color: Colors.plum[400] },
  progressDots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.plum[500],
  },
  dotFilled: { backgroundColor: Colors.blush[500], borderColor: Colors.blush[500] },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.plum[400],
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  csCard: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.blush[500],
  },
  csName: { fontSize: 16, fontWeight: '600', color: Colors.ivory },
  csArrow: { fontSize: 18, color: Colors.plum[400] },
  csCardIncomplete: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.champagne[400],
  },
  csIncompleteText: { fontSize: 14, color: Colors.champagne[400], fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  statValue: { fontSize: 26, fontWeight: '700', color: Colors.ivory, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.plum[400], textAlign: 'center' },
  connectorCta: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.champagne[400] + '80',
  },
  connectorCtaTitle: { fontSize: 15, fontWeight: '600', color: Colors.champagne[400], marginBottom: 3 },
  connectorCtaSub: { fontSize: 12, color: Colors.plum[400], maxWidth: 240 },
  connectorCtaArrow: { fontSize: 20, color: Colors.champagne[400] },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
  },
  settingsRowText: { fontSize: 15, color: Colors.plum[200] },
  settingsRowArrow: { fontSize: 20, color: Colors.plum[500] },
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.plum[700],
    borderRadius: 12,
  },
  signOutText: { fontSize: 15, color: Colors.blush[400], fontWeight: '500' },
});
