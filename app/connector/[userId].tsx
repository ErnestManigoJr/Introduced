import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface ConnectorProfile {
  id: string;
  user_id: string;
  handle: string | null;
  tagline: string | null;
  bio: string | null;
  avatar_url: string | null;
  sponsor_name: string | null;
  sponsor_url: string | null;
  sponsor_logo_url: string | null;
  sponsor_cta: string | null;
  sponsor_active: boolean;
  total_intros: number;
  successful_matches: number;
  verified_connector: boolean;
  app_user: { display_name: string; username: string } | null;
}

export default function ConnectorProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { appUser } = useAuthStore();
  const [profile, setProfile] = useState<ConnectorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentIntros, setRecentIntros] = useState<any[]>([]);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOwnProfile = userId === appUser?.id;

  useEffect(() => {
    if (!userId) return;
    loadProfile();
    if (!isOwnProfile && appUser?.id) checkExistingRequest();
  }, [userId]);

  async function loadProfile() {
    const { data } = await supabase
      .from('connector_profiles')
      .select('*, app_user:app_users!user_id(display_name, username)')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) setProfile(data as unknown as ConnectorProfile);

    const { data: intros } = await supabase
      .from('introductions')
      .select(`
        id, status, created_at,
        person_a:app_users!person_a_id(display_name),
        person_b:app_users!person_b_id(display_name)
      `)
      .eq('connector_id', userId)
      .eq('status', 'both_accepted')
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentIntros(intros ?? []);
    setLoading(false);
  }

  async function checkExistingRequest() {
    const { data } = await supabase
      .from('intro_requests')
      .select('status')
      .eq('requester_id', appUser!.id)
      .eq('connector_id', userId)
      .maybeSingle();
    if (data) setRequestStatus(data.status);
  }

  async function submitRequest() {
    if (!appUser?.id || !userId) return;
    setSubmitting(true);
    const { error } = await supabase.from('intro_requests').insert({
      requester_id: appUser.id,
      connector_id: userId,
      note: requestNote.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', 'Could not send request. Please try again.');
    } else {
      setRequestStatus('pending');
      setShowRequestModal(false);
      setRequestNote('');
      Alert.alert('Request sent!', `${(profile?.app_user as any)?.display_name} will be notified.`);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blush[500]} size="large" />
      </View>
    );
  }

  const appUserData = profile?.app_user as any;
  const successRate = profile && profile.total_intros > 0
    ? Math.round((profile.successful_matches / profile.total_intros) * 100)
    : 0;
  const isVerified = profile?.verified_connector || (profile?.successful_matches ?? 0) >= 5;

  return (
    <>
      <ScrollView style={styles.safe} contentContainerStyle={styles.scroll}>
        {/* Banner + Avatar */}
        <View style={styles.banner} />
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, isVerified && styles.avatarVerified]}>
            <Text style={styles.avatarInitial}>
              {appUserData?.display_name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          {isOwnProfile && (
            <Pressable style={styles.editBtn} onPress={() => router.push('/profile/connector-setup')}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </Pressable>
          )}
        </View>

        {/* Identity */}
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{appUserData?.display_name ?? '—'}</Text>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✦ Verified Connector</Text>
              </View>
            )}
          </View>
          {profile?.handle && <Text style={styles.handle}>@{profile.handle}</Text>}
          {profile?.tagline && <Text style={styles.tagline}>{profile.tagline}</Text>}
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox value={profile?.total_intros ?? 0} label="Introductions" />
          <StatBox value={profile?.successful_matches ?? 0} label="Matches" />
          <StatBox value={`${successRate}%`} label="Success Rate" />
        </View>

        {/* Ask to introduce me — shown to other users only */}
        {!isOwnProfile && (
          <View style={styles.requestSection}>
            {requestStatus === null && (
              <Pressable style={styles.askBtn} onPress={() => setShowRequestModal(true)}>
                <Text style={styles.askBtnText}>Ask {appUserData?.display_name?.split(' ')[0] ?? 'them'} to Introduce Me</Text>
              </Pressable>
            )}
            {requestStatus === 'pending' && (
              <View style={styles.requestedPill}>
                <Text style={styles.requestedPillText}>◎ Request Pending</Text>
              </View>
            )}
            {requestStatus === 'accepted' && (
              <View style={[styles.requestedPill, styles.requestedPillAccepted]}>
                <Text style={[styles.requestedPillText, { color: Colors.blush[400] }]}>✦ Request Accepted</Text>
              </View>
            )}
            {requestStatus === 'fulfilled' && (
              <View style={[styles.requestedPill, styles.requestedPillAccepted]}>
                <Text style={[styles.requestedPillText, { color: Colors.blush[400] }]}>✦ Introduced!</Text>
              </View>
            )}
            {requestStatus === 'declined' && (
              <View style={styles.requestedPill}>
                <Text style={styles.requestedPillText}>Request Declined</Text>
              </View>
            )}
          </View>
        )}

        {/* Sponsor card */}
        {profile?.sponsor_active && profile.sponsor_name && (
          <Pressable
            style={styles.sponsorCard}
            onPress={() => profile.sponsor_url && Linking.openURL(profile.sponsor_url)}
          >
            <View style={styles.sponsorLeft}>
              <Text style={styles.sponsorBadge}>Sponsored</Text>
              <Text style={styles.sponsorName}>{profile.sponsor_name}</Text>
              {profile.sponsor_cta && (
                <Text style={styles.sponsorCta}>{profile.sponsor_cta} →</Text>
              )}
            </View>
          </Pressable>
        )}

        {/* Recent matches */}
        {recentIntros.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Matches</Text>
            {recentIntros.map((intro) => (
              <View key={intro.id} style={styles.introRow}>
                <Text style={styles.introNames}>
                  {(intro.person_a as any)?.display_name} & {(intro.person_b as any)?.display_name}
                </Text>
                <Text style={styles.introMatch}>✦ Match</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Request modal */}
      <Modal visible={showRequestModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Ask {appUserData?.display_name?.split(' ')[0]} to Introduce You</Text>
            <Text style={styles.modalSub}>Add a note to help them understand what you're looking for (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={requestNote}
              onChangeText={setRequestNote}
              placeholder="e.g. Looking for someone creative in NYC who loves building things..."
              placeholderTextColor={Colors.plum[500]}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{requestNote.length}/300</Text>
            <Pressable
              style={[styles.modalSubmit, submitting && { opacity: 0.5 }]}
              onPress={submitRequest}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={Colors.ivory} />
                : <Text style={styles.modalSubmitText}>Send Request</Text>}
            </Pressable>
            <Pressable style={styles.modalCancel} onPress={() => setShowRequestModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function StatBox({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.background },
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  banner: { height: 120, backgroundColor: Colors.plum[800] },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -36,
    marginBottom: 12,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.plum[700],
    borderWidth: 3, borderColor: Theme.background,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarVerified: { borderColor: Colors.champagne[400] },
  avatarInitial: { fontSize: 28, fontWeight: '700', color: Colors.blush[400] },
  editBtn: {
    borderWidth: 1, borderColor: Colors.plum[600],
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6,
  },
  editBtnText: { fontSize: 13, color: Colors.plum[300] },
  identity: { paddingHorizontal: 16, gap: 4, marginBottom: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  displayName: { fontSize: 20, fontWeight: '700', color: Colors.ivory },
  verifiedBadge: {
    backgroundColor: Colors.champagne[400] + '25',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.champagne[400],
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: Colors.champagne[400] },
  handle: { fontSize: 14, color: Colors.plum[400] },
  tagline: { fontSize: 15, color: Colors.champagne[400], fontWeight: '500', marginTop: 4 },
  bio: { fontSize: 14, color: Colors.plum[300], lineHeight: 21, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.ivory },
  statLabel: { fontSize: 11, color: Colors.plum[400] },
  requestSection: { paddingHorizontal: 16, marginBottom: 16 },
  askBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  askBtnText: { color: Colors.ivory, fontWeight: '700', fontSize: 15 },
  requestedPill: {
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.plum[600],
    backgroundColor: Colors.plum[800],
  },
  requestedPillAccepted: { borderColor: Colors.blush[500] },
  requestedPillText: { fontSize: 14, color: Colors.plum[400], fontWeight: '600' },
  sponsorCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.champagne[400],
    marginBottom: 16,
  },
  sponsorLeft: { gap: 4 },
  sponsorBadge: {
    fontSize: 10, fontWeight: '700', color: Colors.champagne[400],
    textTransform: 'uppercase', letterSpacing: 1,
  },
  sponsorName: { fontSize: 16, fontWeight: '700', color: Colors.ivory },
  sponsorCta: { fontSize: 13, color: Colors.champagne[400] },
  section: { marginHorizontal: 16, gap: 2 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.plum[400],
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  introRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.plum[800],
  },
  introNames: { fontSize: 14, color: Colors.plum[200] },
  introMatch: { fontSize: 12, color: Colors.blush[400], fontWeight: '600' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.plum[900] ?? '#1a0f22',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 12,
    borderTopWidth: 1, borderColor: Colors.plum[700],
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.ivory },
  modalSub: { fontSize: 13, color: Colors.plum[400], lineHeight: 19 },
  modalInput: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    color: Colors.ivory,
    fontSize: 14,
    padding: 14,
    minHeight: 100,
  },
  charCount: { fontSize: 11, color: Colors.plum[500], textAlign: 'right' },
  modalSubmit: {
    backgroundColor: Colors.blush[500],
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalSubmitText: { color: Colors.ivory, fontWeight: '700', fontSize: 15 },
  modalCancel: { paddingVertical: 10, alignItems: 'center' },
  modalCancelText: { color: Colors.plum[400], fontSize: 14 },
});
