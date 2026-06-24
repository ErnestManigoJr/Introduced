import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Theme, Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

const SUGGESTED_TAGS = ['dating', 'friendship', 'career', 'faith', 'wellness', 'creativity', 'parenting', 'sports', 'travel', 'culture'];

export default function CreateCommunityScreen() {
  const { appUser } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  }

  async function create() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your community a name.');
      return;
    }
    if (!appUser?.id) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('communities')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: appUser.id,
        community_type: isPrivate ? 'private' : 'public',
        tags: selectedTags,
        is_live: false,
      })
      .select('id')
      .single();

    if (error || !data) {
      Alert.alert('Error', 'Could not create community. Try again.');
      setSubmitting(false);
      return;
    }

    // Add creator as owner
    await supabase.from('community_members').insert({
      community_id: data.id,
      user_id: appUser.id,
      role: 'owner',
    });

    router.replace(`/community/${data.id}`);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Community Name</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g. Black Creatives NYC"
            placeholderTextColor={Colors.plum[500]}
            value={name}
            onChangeText={setName}
            maxLength={60}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="What's this community about?"
            placeholderTextColor={Colors.plum[500]}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tags <Text style={styles.labelHint}>(up to 5)</Text></Text>
          <View style={styles.tagGrid}>
            {SUGGESTED_TAGS.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
              >
                <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Visibility</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, !isPrivate && styles.toggleBtnActive]}
              onPress={() => setIsPrivate(false)}
            >
              <Text style={[styles.toggleText, !isPrivate && styles.toggleTextActive]}>Public</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, isPrivate && styles.toggleBtnActive]}
              onPress={() => setIsPrivate(true)}
            >
              <Text style={[styles.toggleText, isPrivate && styles.toggleTextActive]}>Private</Text>
            </Pressable>
          </View>
          <Text style={styles.visibilityHint}>
            {isPrivate ? 'Members must be invited.' : 'Anyone can find and join.'}
          </Text>
        </View>

        <Pressable
          style={[styles.createBtn, submitting && styles.createBtnDisabled]}
          onPress={create}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color={Colors.ivory} />
            : <Text style={styles.createBtnText}>Create Community</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  field: { gap: 8 },
  label: { fontSize: 15, fontWeight: '700', color: Colors.ivory },
  labelHint: { fontSize: 13, color: Colors.plum[400], fontWeight: '400' },
  input: {
    backgroundColor: Colors.plum[800],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.plum[700],
    color: Colors.ivory,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.plum[600],
    backgroundColor: Colors.plum[800],
  },
  tagSelected: { backgroundColor: Colors.blush[500], borderColor: Colors.blush[500] },
  tagText: { fontSize: 13, color: Colors.plum[300] },
  tagTextSelected: { color: Colors.ivory, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.plum[800],
    borderWidth: 1,
    borderColor: Colors.plum[700],
  },
  toggleBtnActive: { backgroundColor: Colors.plum[700], borderColor: Colors.blush[500] },
  toggleText: { fontSize: 14, color: Colors.plum[400] },
  toggleTextActive: { color: Colors.ivory, fontWeight: '600' },
  visibilityHint: { fontSize: 12, color: Colors.plum[500] },
  createBtn: {
    backgroundColor: Colors.blush[500],
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: Colors.ivory, fontWeight: '700', fontSize: 16 },
});
