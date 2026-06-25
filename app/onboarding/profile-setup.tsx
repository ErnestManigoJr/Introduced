import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

const GENDER_OPTIONS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say', 'Other'];
const INTENTION_OPTIONS = [
  { key: 'friendship', label: 'Friendship' },
  { key: 'dating',     label: 'Dating' },
  { key: 'both',       label: 'Both' },
];

export default function ProfileSetupScreen() {
  const { appUser, setAppUser } = useAuthStore();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [gender, setGender] = useState('');
  const [intention, setIntention] = useState('both');
  const [saving, setSaving] = useState(false);

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function uploadAvatar(userId: string): Promise<string | null> {
    if (!avatarUri) return null;
    try {
      const ext = avatarUri.split('.').pop() ?? 'jpg';
      const path = `avatars/${userId}.${ext}`;
      const response = await fetch(avatarUri);
      const blob = await response.blob();
      const { error } = await supabase.storage.from('media').upload(path, blob, {
        contentType: `image/${ext}`,
        upsert: true,
      });
      if (error) return null;
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      return data.publicUrl;
    } catch {
      return null;
    }
  }

  async function handleContinue() {
    if (!appUser?.id) return;
    setSaving(true);

    const avatarUrl = await uploadAvatar(appUser.id);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: appUser.id,
        bio: bio.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        gender: gender || null,
        relationship_intention: intention as any,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      Alert.alert('Error', 'Could not save profile. You can update it later in Settings.');
    }

    // Refresh auth store with latest user data
    const { data: updated } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', appUser.id)
      .single();
    if (updated) setAppUser(updated as any);

    setSaving(false);
    router.push('/onboarding/privacy-preferences');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.heading}>Set up your profile.</Text>
          <Text style={styles.subtitle}>Tell us a bit about you.</Text>
        </View>

        {/* Avatar */}
        <Pressable style={styles.avatarContainer} onPress={pickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.avatarHint}>Add photo</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.form}>
          <View>
            <TextInput
              style={styles.bioInput}
              placeholder="Write a short bio (optional)"
              placeholderTextColor={Colors.plum[500]}
              value={bio}
              onChangeText={(v) => setBio(v.slice(0, 300))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
            <Text style={styles.charCount}>{bio.length} / 300</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="City (optional)"
            placeholderTextColor={Colors.plum[500]}
            value={city}
            onChangeText={setCity}
          />

          <TextInput
            style={styles.input}
            placeholder="State (optional)"
            placeholderTextColor={Colors.plum[500]}
            value={state}
            onChangeText={setState}
          />

          <View>
            <Text style={styles.sectionLabel}>Gender</Text>
            <View style={styles.optionsWrap}>
              {GENDER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.optionChip, gender === opt && styles.optionChipSelected]}
                  onPress={() => setGender(gender === opt ? '' : opt)}
                >
                  <Text style={[styles.optionChipText, gender === opt && styles.optionChipTextSelected]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.sectionLabel}>I'm open to</Text>
            <View style={styles.optionsRow}>
              {INTENTION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[styles.intentionChip, intention === opt.key && styles.optionChipSelected]}
                  onPress={() => setIntention(opt.key)}
                >
                  <Text style={[styles.optionChipText, intention === opt.key && styles.optionChipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
            onPress={handleContinue}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={Colors.ivory} />
              : <Text style={styles.primaryButtonText}>Continue</Text>}
          </Pressable>

          <Pressable onPress={() => router.push('/onboarding/privacy-preferences')}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },
  header: { marginTop: 48, marginBottom: 28 },
  heading: { fontSize: 34, fontWeight: '700', color: Colors.ivory, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.champagne[400] },
  avatarContainer: { alignSelf: 'center', marginBottom: 32 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: Colors.blush[500] },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.plum[800],
    borderWidth: 2, borderColor: Colors.plum[600],
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  cameraIcon: { fontSize: 28 },
  avatarHint: { fontSize: 11, color: Colors.plum[400] },
  form: { gap: 16 },
  input: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.ivory,
    borderWidth: 1, borderColor: Colors.plum[700],
  },
  bioInput: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.ivory,
    borderWidth: 1, borderColor: Colors.plum[700],
    minHeight: 100,
  },
  charCount: { fontSize: 11, color: Colors.plum[400], textAlign: 'right', marginTop: 4 },
  sectionLabel: {
    fontSize: 13, color: Colors.plum[300], fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionsRow: { flexDirection: 'row', gap: 8 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.plum[800], borderWidth: 1, borderColor: Colors.plum[700],
  },
  intentionChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.plum[800], borderWidth: 1, borderColor: Colors.plum[700],
    alignItems: 'center',
  },
  optionChipSelected: { backgroundColor: Colors.blush[500], borderColor: Colors.blush[500] },
  optionChipText: { fontSize: 14, color: Colors.plum[400] },
  optionChipTextSelected: { color: Colors.ivory, fontWeight: '600' },
  primaryButton: {
    backgroundColor: Colors.blush[500], borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: Colors.ivory },
  skipText: { textAlign: 'center', fontSize: 14, color: Colors.plum[400], marginTop: 4 },
});
