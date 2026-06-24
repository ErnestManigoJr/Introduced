import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

export default function PrivacyScreen() {
  const { appUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [openToIntros, setOpenToIntros] = useState(true);
  const [showInSearch, setShowInSearch] = useState(true);
  const [showConnectionCount, setShowConnectionCount] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    if (!appUser?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('open_to_introductions, show_in_search, show_connection_count')
      .eq('user_id', appUser.id)
      .single();

    if (data) {
      setOpenToIntros(data.open_to_introductions ?? true);
      setShowInSearch(data.show_in_search ?? true);
      setShowConnectionCount(data.show_connection_count ?? true);
    }
    setLoading(false);
  }

  async function update(field: string, value: boolean) {
    if (!appUser?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('user_id', appUser.id);
    if (error) Alert.alert('Error', 'Could not save setting.');
  }

  function toggle(setter: (v: boolean) => void, field: string, value: boolean) {
    setter(value);
    update(field, value);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blush[500]} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.sectionHeader}>Visibility</Text>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Open to Introductions</Text>
            <Text style={styles.rowSub}>Allow others to introduce you to new people</Text>
          </View>
          <Switch
            value={openToIntros}
            onValueChange={(v) => toggle(setOpenToIntros, 'open_to_introductions', v)}
            trackColor={{ false: Colors.plum[700], true: Colors.blush[500] }}
            thumbColor={Colors.ivory}
          />
        </View>
        <View style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Appear in Search</Text>
            <Text style={styles.rowSub}>Let people find you when searching for users</Text>
          </View>
          <Switch
            value={showInSearch}
            onValueChange={(v) => toggle(setShowInSearch, 'show_in_search', v)}
            trackColor={{ false: Colors.plum[700], true: Colors.blush[500] }}
            thumbColor={Colors.ivory}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Show Connection Count</Text>
            <Text style={styles.rowSub}>Display how many connections you have on your profile</Text>
          </View>
          <Switch
            value={showConnectionCount}
            onValueChange={(v) => toggle(setShowConnectionCount, 'show_connection_count', v)}
            trackColor={{ false: Colors.plum[700], true: Colors.blush[500] }}
            thumbColor={Colors.ivory}
          />
        </View>
      </View>

      <Text style={styles.note}>
        Your data is never sold to third parties. Introduced uses it only to facilitate meaningful introductions.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.plum[700] },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, color: Colors.ivory, fontWeight: '500' },
  rowSub: { fontSize: 12, color: Colors.plum[400], marginTop: 2 },
  note: { fontSize: 12, color: Colors.plum[500], lineHeight: 18, textAlign: 'center', marginTop: 8 },
});
