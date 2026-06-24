import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/ui/Button';

interface Introduction {
  id: string;
  status: string;
  created_at: string;
  note: string | null;
  person_a: { display_name: string; username: string } | null;
  person_b: { display_name: string; username: string } | null;
  connector: { display_name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  a_accepted: 'Waiting on them',
  b_accepted: 'Waiting on them',
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

export default function IntroduceScreen() {
  const { appUser, connectionStyleComplete } = useAuthStore();
  const [intros, setIntros] = useState<Introduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    if (!appUser?.id) return;
    fetchIntros();
  }, [appUser?.id]);

  async function fetchIntros() {
    if (!appUser?.id) return;
    const { data } = await supabase
      .from('introductions')
      .select(`
        id, status, created_at, note,
        person_a:app_users!person_a_id(display_name, username),
        person_b:app_users!person_b_id(display_name, username),
        connector:app_users!connector_id(display_name)
      `)
      .or(`person_a_id.eq.${appUser.id},person_b_id.eq.${appUser.id},connector_id.eq.${appUser.id}`)
      .order('created_at', { ascending: false });

    if (data) setIntros(data as unknown as Introduction[]);
    setLoading(false);
  }

  const received = intros.filter(
    (i) => (i.person_a as any)?.username !== appUser?.username &&
            (i.person_b as any)?.username !== appUser?.username
      ? false
      : true
  );
  const sent = intros.filter(
    (i) => (i.connector as any)?.display_name === appUser?.display_name
  );

  const displayed = tab === 'received' ? received : sent;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Introduce</Text>
          <Text style={styles.headerSub}>
            {appUser?.introductions_made ?? 0} / 2 introductions made
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.leaderboardBtn} onPress={() => router.push('/connector/leaderboard')}>
            <Text style={styles.leaderboardBtnText}>✦</Text>
          </Pressable>
          {connectionStyleComplete && (
            <Pressable style={styles.newIntroBtn} onPress={() => router.push('/introduce/suggest')}>
              <Text style={styles.newIntroBtnText}>+ Introduce</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Connection Style prompt */}
      {!connectionStyleComplete && (
        <Pressable style={styles.csBanner} onPress={() => router.push('/onboarding/connection-style')}>
          <Text style={styles.csBannerText}>✦ Complete your Connection Style to unlock introductions</Text>
          <Text style={styles.csBannerArrow}>→</Text>
        </Pressable>
      )}

      {/* Unlock status */}
      {connectionStyleComplete && (
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>
            {(appUser?.introductions_made ?? 0) >= 2
              ? '✦ Open to Introductions'
              : `Make ${2 - (appUser?.introductions_made ?? 0)} more introduction${(appUser?.introductions_made ?? 0) === 1 ? '' : 's'} to unlock`}
          </Text>
          <View style={styles.progressDots}>
            {[0, 1].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < (appUser?.introductions_made ?? 0) && styles.dotFilled,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['received', 'sent'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'received' ? 'Received' : 'Sent'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.blush[500]} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {displayed.length === 0 ? (
            <EmptyState tab={tab} connectionStyleComplete={connectionStyleComplete} />
          ) : (
            displayed.map((intro) => (
              <IntroCard key={intro.id} intro={intro} currentUserId={appUser?.id ?? ''} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function IntroCard({ intro, currentUserId }: { intro: Introduction; currentUserId: string }) {
  const personA = intro.person_a as any;
  const personB = intro.person_b as any;
  const connector = intro.connector as any;
  const color = STATUS_COLOR[intro.status] ?? Colors.plum[400];

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.personChip}>
          <Text style={styles.personInitial}>{personA?.display_name?.[0] ?? '?'}</Text>
        </View>
        <Text style={styles.connector}>✦</Text>
        <View style={styles.personChip}>
          <Text style={styles.personInitial}>{personB?.display_name?.[0] ?? '?'}</Text>
        </View>
      </View>
      <Text style={styles.cardNames}>
        {personA?.display_name} & {personB?.display_name}
      </Text>
      {connector && (
        <Text style={styles.cardConnector}>Introduced by {connector.display_name}</Text>
      )}
      {intro.note && <Text style={styles.cardNote}>"{intro.note}"</Text>}
      <View style={[styles.statusBadge, { borderColor: color }]}>
        <Text style={[styles.statusText, { color }]}>{STATUS_LABEL[intro.status] ?? intro.status}</Text>
      </View>
    </View>
  );
}

function EmptyState({ tab, connectionStyleComplete }: { tab: string; connectionStyleComplete: boolean }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>✦</Text>
      <Text style={styles.emptyTitle}>
        {tab === 'received' ? 'No introductions yet' : 'You haven\'t introduced anyone yet'}
      </Text>
      <Text style={styles.emptyBody}>
        {tab === 'received'
          ? 'When someone introduces you to another person, it\'ll appear here.'
          : connectionStyleComplete
            ? 'Introduce two people in your network to get started.'
            : 'Complete your Connection Style first.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leaderboardBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.plum[800],
    borderWidth: 1, borderColor: Colors.plum[600],
    alignItems: 'center', justifyContent: 'center',
  },
  leaderboardBtnText: { fontSize: 16, color: Colors.champagne[400] },
  newIntroBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  newIntroBtnText: { color: Colors.ivory, fontWeight: '600', fontSize: 13 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.ivory },
  headerSub: { fontSize: 13, color: Colors.plum[400], marginTop: 2 },
  csBanner: {
    margin: 16,
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.blush[500],
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  csBannerText: { fontSize: 14, color: Colors.champagne[400], flex: 1, fontWeight: '500' },
  csBannerArrow: { fontSize: 18, color: Colors.blush[500], marginLeft: 8 },
  statusCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: { fontSize: 14, color: Colors.champagne[400], fontWeight: '600' },
  progressDots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.plum[500],
  },
  dotFilled: { backgroundColor: Colors.blush[500], borderColor: Colors.blush[500] },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.plum[800],
    borderRadius: 10,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: Colors.plum[700] },
  tabText: { fontSize: 14, color: Colors.plum[400], fontWeight: '500' },
  tabTextActive: { color: Colors.ivory },
  scroll: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.plum[800],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    gap: 8,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.plum[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.blush[500],
  },
  personInitial: { fontSize: 18, fontWeight: '700', color: Colors.blush[400] },
  connector: { fontSize: 20, color: Colors.champagne[400] },
  cardNames: { fontSize: 16, fontWeight: '600', color: Colors.ivory },
  cardConnector: { fontSize: 13, color: Colors.plum[400] },
  cardNote: { fontSize: 14, color: Colors.plum[300], fontStyle: 'italic' },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, color: Colors.plum[600] },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.ivory, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: Colors.plum[400], textAlign: 'center', lineHeight: 22 },
});
