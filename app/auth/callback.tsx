import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

export default function AuthCallback() {
  const params = useLocalSearchParams();
  const { setAppUser, setLoading } = useAuthStore();

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    setLoading(true);

    try {
      // Give Supabase a moment to process the OAuth session from the URL
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.user) {
        // Auth failed — send back to welcome
        router.replace('/welcome');
        return;
      }

      // Check if this user has an app_users row (i.e. has completed at least step 1 of onboarding)
      const { data: appUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      setAppUser(appUser ?? null);
      setLoading(false);

      if (!appUser) {
        // Brand new OAuth user — start onboarding
        router.replace('/onboarding/age-consent');
        return;
      }

      if (appUser.onboarding_status === 'complete') {
        router.replace('/(tabs)/nest');
        return;
      }

      // Mid-onboarding resume
      router.replace('/');
    } catch {
      setLoading(false);
      router.replace('/welcome');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#2D1B35', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator size="large" color="#e2507a" />
      <Text style={{ color: '#c49fd5', fontSize: 14 }}>Signing you in…</Text>
    </View>
  );
}

