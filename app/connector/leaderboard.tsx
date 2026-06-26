import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface ConnectorRow {
  user_id: string;
  handle: string | null;
  successful_matches: number;
  total_intros: number;
  sponsor_name: string | null;
  sponsor_active: boolean;
  verified_connector: boolean;
  app_user: { display_name: string; username: string } | null;
}

const RANK_COLORS = [Colors.champagne[400], Colors.plum[300], Colors.plum[400]];
const RANK_BADGES = ['✦', '◈', '◇'];

export default function LeaderboardScreen() {
  const { appUser } = useAuthStore();
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    const { data } = await supabase
      .from('connector_profiles')
      .select('user_id, handle, successful_matches, total_intros, sponsor_name, sponsor_active, verified_connector, app_user:app_users!user_id(display_name, username)')
      .eq('is_public', true)
      .order('successful_matches', { ascending: false })
      .limit(50);

    if (data) {
      setConnectors(data as unknown as ConnectorRow[]);
      const idx = data.findIndex((c: any) => c.user_id === appUser?.id);
      if (idx >= 0) setMyRank(idx + 1);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blush[500]} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Top Connectors</Text>
        <Text style={styles.headerSub}>Ranked by successful introductions</Text>
        {myRank && (
          <View style={styles.myRankRow}>
            <Text style={styles.myRankText}>Your rank: #{myRank}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={connectors}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Pressable
            style={[styles.row, item.user_id === appUser?.id && styles.rowMine]}
            onPress={() => router.push(`/connector/${item.user_id}`)}
          >
            <View style={styles.rankWrap}>
              {index < 3 ? (
                <Text style={[styles.rankBadge, { color: RANK_COLORS[index] }]}>
                  {RANK_BADGES[index]}
                </Text>
              ) : (
                <Text style={styles.rankNumber}>#{index + 1}</Text>
              )}
            </View>

            <View style={styles.rowAvatar}>
              <Text style={styles.rowInitial}>
                {(item.app_user as any)?.display_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>

            <View style={styles.rowInfo}>
              <View style={styles.rowNameRow}>
                <Text style={styles.rowName}>{(item.app_user as any)?.display_name ?? '—'}</Text>
                {(item.verified_connector || item.successful_matches >= 5) && (
                  <Text style={styles.verifiedIcon}>✦</Text>
                )}
                {item.sponsor_active && item.sponsor_name && (
                  <View style={styles.sponsoredBadge}>
                    <Text style={styles.sponsoredText}>{item.sponsor_name}</Text>
                  </View>
                )}
              </View>
              {item.handle && <Text style={styles.rowHandle}>@{item.handle}</Text>}
            </View>

            <View style={styles.rowStats}>
              <Text style={styles.rowMatchCount}>{item.successful_matches}</Text>
              <Text style={styles.rowMatchLabel}>matches</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✦</Text>
            <Text style={styles.emptyTitle}>No connectors yet</Text>
            <Text style={styles.emptyBody}>Be the first to make introductions and appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.background },
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
    gap: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.ivory },
  headerSub: { fontSize: 13, color: Colors.plum[400] },
  myRankRow: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.blush[500],
  },
  myRankText: { fontSize: 13, color: Colors.blush[400], fontWeight: '600' },
  list: { paddingBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.plum[800],
    gap: 12,
  },
  rowMine: { backgroundColor: Colors.plum[800] + '40' },
  rankWrap: { width: 32, alignItems: 'center' },
  rankBadge: { fontSize: 20, fontWeight: '700' },
  rankNumber: { fontSize: 13, color: Colors.plum[500], fontWeight: '600' },
  rowAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.plum[700],
    borderWidth: 1.5, borderColor: Colors.blush[500],
    alignItems: 'center', justifyContent: 'center',
  },
  rowInitial: { fontSize: 17, fontWeight: '700', color: Colors.blush[400] },
  rowInfo: { flex: 1, gap: 2 },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.ivory },
  sponsoredBadge: {
    backgroundColor: Colors.champagne[400] + '30',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.champagne[400],
  },
  sponsoredText: { fontSize: 10, color: Colors.champagne[400], fontWeight: '700' },
  rowHandle: { fontSize: 12, color: Colors.plum[400] },
  verifiedIcon: { fontSize: 12, color: Colors.champagne[400], fontWeight: '700' },
  rowStats: { alignItems: 'center' },
  rowMatchCount: { fontSize: 20, fontWeight: '700', color: Colors.blush[400] },
  rowMatchLabel: { fontSize: 10, color: Colors.plum[400] },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, color: Colors.plum[600] },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.ivory },
  emptyBody: { fontSize: 14, color: Colors.plum[400], textAlign: 'center', lineHeight: 22 },
});
