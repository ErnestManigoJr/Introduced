import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface IntroDetail {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
  signal_score: number | null;
  connector_id: string;
  person_a_id: string;
  person_b_id: string;
  intro_room_id: string | null;
  person_a: { id: string; display_name: string; username: string } | null;
  person_b: { id: string; display_name: string; username: string } | null;
  connector: { id: string; display_name: string; username: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting Response',
  a_accepted: 'Waiting on the other person',
  b_accepted: 'Waiting on the other person',
  both_accepted: 'Connected ✦',
  declined: 'Declined',
  expired: 'Expired',
  completed: 'Completed',
};

const STATUS_COLOR: Record<string, string> = {
  pending: Colors.champagne[400],
  a_accepted: Colors.champagne[400],
  b_accepted: Colors.champagne[400],
  both_accepted: Colors.blush[500],
  declined: Colors.plum[400],
  expired: Colors.plum[400],
  completed: Colors.blush[400],
};

function getSignalLabel(score: number | null): string {
  if (score === null) return '';
  if (score >= 80) return 'Strong Introduction Signal';
  if (score >= 60) return 'Good Introduction Signal';
  if (score >= 40) return 'Possible Connection';
  return 'Early Signal';
}

export default function IntroDetailScreen() {
  const { appUser } = useAuthStore();
  const params = useLocalSearchParams<{ id: string; sent?: string }>();
  const [intro, setIntro] = useState<IntroDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const justSent = params.sent === 'true';

  useEffect(() => {
    fetchIntro();
  }, [params.id]);

  async function fetchIntro() {
    const { data, error } = await supabase
      .from('introductions')
      .select(`
        id, status, note, created_at, signal_score, connector_id, person_a_id, person_b_id, intro_room_id,
        person_a:app_users!person_a_id(id, display_name, username),
        person_b:app_users!person_b_id(id, display_name, username),
        connector:app_users!connector_id(id, display_name, username)
      `)
      .eq('id', params.id)
      .maybeSingle();

    if (!error && data) setIntro(data as unknown as IntroDetail);
    setLoading(false);
  }

  async function respond(accept: boolean) {
    if (!intro || !appUser) return;
    setActing(true);

    const isPersonA = intro.person_a_id === appUser.id;
    const isPersonB = intro.person_b_id === appUser.id;

    if (!isPersonA && !isPersonB) {
      setActing(false);
      return;
    }

    // Guard: cannot accept twice
    if (
      (isPersonA && (intro.status === 'a_accepted' || intro.status === 'both_accepted')) ||
      (isPersonB && (intro.status === 'b_accepted' || intro.status === 'both_accepted'))
    ) {
      Alert.alert('Already responded', 'You have already responded to this introduction.');
      setActing(false);
      return;
    }

    let newStatus: string;

    if (!accept) {
      newStatus = 'declined';
    } else if (isPersonA) {
      newStatus = intro.status === 'b_accepted' ? 'both_accepted' : 'a_accepted';
    } else {
      newStatus = intro.status === 'a_accepted' ? 'both_accepted' : 'b_accepted';
    }

    const { error } = await supabase
      .from('introductions')
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq('id', intro.id);

    if (error) {
      Alert.alert('Error', 'Could not update introduction. Try again.');
      setActing(false);
      return;
    }

    // If both accepted, create an intro_room for them to meet
    if (newStatus === 'both_accepted') {
      const livekitRoomName = `intro-${intro.id}`;

      const { data: room } = await supabase
        .from('intro_rooms')
        .insert({
          introduction_id: intro.id,
          livekit_room_name: livekitRoomName,
          created_by: appUser.id,
          status: 'waiting',
        })
        .select('id')
        .maybeSingle();

      if (room) {
        // Store room ID on the introduction for navigation
        await supabase
          .from('introductions')
          .update({ intro_room_id: room.id })
          .eq('id', intro.id);
      }
    }

    await fetchIntro();
    setActing(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blush[500]} size="large" />
      </View>
    );
  }

  if (!intro) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Introduction not found.</Text>
      </View>
    );
  }

  const personA = intro.person_a as any;
  const personB = intro.person_b as any;
  const connector = intro.connector as any;
  const statusColor = STATUS_COLOR[intro.status] ?? Colors.plum[400];

  const isPersonA = intro.person_a_id === appUser?.id;
  const isPersonB = intro.person_b_id === appUser?.id;
  const isConnector = intro.connector_id === appUser?.id;

  // I need to respond if:
  //  - I'm person A and haven't responded yet (pending or b already accepted)
  //  - I'm person B and haven't responded yet (pending or a already accepted)
  const needsMyResponse =
    (isPersonA && (intro.status === 'pending' || intro.status === 'b_accepted')) ||
    (isPersonB && (intro.status === 'pending' || intro.status === 'a_accepted'));

  return (
    <ScrollView contentContainerStyle={styles.scroll}>

      {/* Sent confirmation banner */}
      {justSent && (
        <View style={styles.successBanner}>
          <Text style={styles.successIcon}>✦</Text>
          <Text style={styles.successText}>Introduction sent! They'll receive a notification.</Text>
        </View>
      )}

      {/* People */}
      <View style={styles.peopleRow}>
        <PersonCard name={personA?.display_name} username={personA?.username} you={isPersonA} />
        <Text style={styles.ampersand}>✦</Text>
        <PersonCard name={personB?.display_name} username={personB?.username} you={isPersonB} />
      </View>

      {/* Connector */}
      {connector && (
        <Text style={styles.connectorLine}>
          Introduced by {isConnector ? 'you' : connector.display_name}
        </Text>
      )}

      {/* Status badge */}
      <View style={[styles.statusBadge, { borderColor: statusColor }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {STATUS_LABEL[intro.status] ?? intro.status}
        </Text>
      </View>

      {/* Signal score */}
      {intro.signal_score !== null && (
        <View style={styles.signalCard}>
          <Text style={styles.signalLabel}>{getSignalLabel(intro.signal_score)}</Text>
          <View style={styles.signalBarBg}>
            <View style={[styles.signalBarFill, { width: `${Math.min(100, intro.signal_score)}%` as any }]} />
          </View>
        </View>
      )}

      {/* Note */}
      {intro.note && (
        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>Introduction note</Text>
          <Text style={styles.noteText}>"{intro.note}"</Text>
        </View>
      )}

      {/* Accept / Decline */}
      {needsMyResponse && (
        <View style={styles.actionSection}>
          <Text style={styles.actionPrompt}>
            {connector?.display_name} wants to introduce you to{' '}
            {isPersonA ? personB?.display_name : personA?.display_name}.
          </Text>
          <Pressable
            style={[styles.acceptBtn, acting && styles.btnDisabled]}
            onPress={() => respond(true)}
            disabled={acting}
          >
            {acting ? <ActivityIndicator color={Colors.ivory} /> : <Text style={styles.acceptBtnText}>Accept Introduction</Text>}
          </Pressable>
          <Pressable
            style={[styles.declineBtn, acting && styles.btnDisabled]}
            onPress={() => {
              Alert.alert('Decline?', 'Are you sure you want to decline this introduction?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Decline', style: 'destructive', onPress: () => respond(false) },
              ]);
            }}
            disabled={acting}
          >
            <Text style={styles.declineBtnText}>Decline</Text>
          </Pressable>
        </View>
      )}

      {/* Both accepted — go to intro room */}
      {intro.status === 'both_accepted' && !isConnector && intro.intro_room_id && (
        <Pressable
          style={styles.messageBtn}
          onPress={() => router.push(`/intro-room/${intro.intro_room_id}`)}
        >
          <Text style={styles.messageBtnText}>Open Video Room →</Text>
        </Pressable>
      )}

      {/* Both accepted but no room yet — show a waiting message */}
      {intro.status === 'both_accepted' && !isConnector && !intro.intro_room_id && (
        <View style={styles.waitingCard}>
          <Text style={styles.waitingText}>Your intro room is being prepared…</Text>
        </View>
      )}

    </ScrollView>
  );
}

function PersonCard({ name, username, you }: { name?: string; username?: string; you: boolean }) {
  return (
    <View style={styles.personCard}>
      <View style={[styles.personAvatar, you && styles.personAvatarYou]}>
        <Text style={styles.personInitial}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <Text style={styles.personName}>{name ?? '—'}</Text>
      <Text style={styles.personUsername}>@{username ?? '—'}</Text>
      {you && <Text style={styles.youLabel}>You</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.plum[400], fontSize: 15 },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.blush[500],
  },
  successIcon: { fontSize: 18, color: Colors.blush[500] },
  successText: { flex: 1, fontSize: 14, color: Colors.champagne[400], fontWeight: '500' },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  personCard: { flex: 1, alignItems: 'center', gap: 4 },
  personAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.plum[700],
    borderWidth: 2, borderColor: Colors.plum[600],
    alignItems: 'center', justifyContent: 'center',
  },
  personAvatarYou: { borderColor: Colors.blush[500] },
  personInitial: { fontSize: 26, fontWeight: '700', color: Colors.blush[400] },
  personName: { fontSize: 14, fontWeight: '700', color: Colors.ivory, textAlign: 'center' },
  personUsername: { fontSize: 12, color: Colors.plum[400] },
  youLabel: { fontSize: 11, color: Colors.blush[400], fontWeight: '600' },
  ampersand: { fontSize: 22, color: Colors.champagne[400] },
  connectorLine: { textAlign: 'center', fontSize: 13, color: Colors.plum[400] },
  statusBadge: {
    alignSelf: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  statusText: { fontSize: 14, fontWeight: '700' },
  signalCard: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  signalLabel: { fontSize: 13, color: Colors.champagne[400], fontWeight: '600' },
  signalBarBg: { height: 6, backgroundColor: Colors.plum[700], borderRadius: 3, overflow: 'hidden' },
  signalBarFill: { height: '100%', backgroundColor: Colors.blush[500], borderRadius: 3 },
  noteCard: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  noteLabel: { fontSize: 11, fontWeight: '700', color: Colors.plum[400], textTransform: 'uppercase', letterSpacing: 0.5 },
  noteText: { fontSize: 15, color: Colors.plum[200], lineHeight: 22, fontStyle: 'italic' },
  actionSection: { gap: 12, marginTop: 8 },
  actionPrompt: { fontSize: 15, color: Colors.plum[200], textAlign: 'center', lineHeight: 22 },
  acceptBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
  },
  acceptBtnText: { color: Colors.ivory, fontWeight: '700', fontSize: 16 },
  declineBtn: {
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.plum[600],
  },
  declineBtnText: { color: Colors.plum[300], fontWeight: '500', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  messageBtn: {
    backgroundColor: Colors.plum[700],
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.blush[500],
    marginTop: 8,
  },
  messageBtnText: { color: Colors.blush[400], fontWeight: '700', fontSize: 15 },
  waitingCard: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.plum[700],
    marginTop: 8,
  },
  waitingText: { fontSize: 14, color: Colors.plum[400] },
});
