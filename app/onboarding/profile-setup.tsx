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
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const GENDER_OPTIONS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say', 'Other'];
const INTENTION_OPTIONS = ['Friendship', 'Dating', 'Both'];

export default function ProfileSetupScreen() {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [gender, setGender] = useState('');
  const [intention, setIntention] = useState('');

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

  function handleContinue() {
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
          {/* Bio */}
          <View>
            <TextInput
              style={styles.bioInput}
              placeholder="Write a short bio (optional)"
              placeholderTextColor="#c49fd5"
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
            placeholderTextColor="#c49fd5"
            value={city}
            onChangeText={setCity}
          />

          <TextInput
            style={styles.input}
            placeholder="State (optional)"
            placeholderTextColor="#c49fd5"
            value={state}
            onChangeText={setState}
          />

          {/* Gender */}
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

          {/* Relationship intention */}
          <View>
            <Text style={styles.sectionLabel}>Relationship Intention</Text>
            <View style={styles.optionsRow}>
              {INTENTION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.intentionChip, intention === opt && styles.optionChipSelected]}
                  onPress={() => setIntention(intention === opt ? '' : opt)}
                >
                  <Text style={[styles.optionChipText, intention === opt && styles.optionChipTextSelected]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable style={styles.primaryButton} onPress={handleContinue}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
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
    marginBottom: 28,
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
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#e2507a',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4a2a5c',
    borderWidth: 2,
    borderColor: '#62397a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cameraIcon: {
    fontSize: 28,
  },
  avatarHint: {
    fontSize: 11,
    color: '#c49fd5',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#4a2a5c',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#62397a',
  },
  bioInput: {
    backgroundColor: '#4a2a5c',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#62397a',
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    color: '#c49fd5',
    textAlign: 'right',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#c49fd5',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#4a2a5c',
    borderWidth: 1,
    borderColor: '#62397a',
  },
  intentionChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#4a2a5c',
    borderWidth: 1,
    borderColor: '#62397a',
    alignItems: 'center',
  },
  optionChipSelected: {
    backgroundColor: '#e2507a',
    borderColor: '#e2507a',
  },
  optionChipText: {
    fontSize: 14,
    color: '#c49fd5',
  },
  optionChipTextSelected: {
    color: '#FAF7F2',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#e2507a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAF7F2',
  },
});
