import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

export default function AuthCallback() {
  useEffect(() => {
    supabase.auth.getSession().then(() => {
      router.replace('/');
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#2D1B35', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#e2507a" />
    </View>
  );
}
