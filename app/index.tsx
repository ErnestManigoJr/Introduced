import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator } from 'react-native';
import { Theme, Colors } from '../src/constants/colors';
import { supabase } from '../src/lib/supabase';

async function getOnboardingResumeRoute(userId: string): Promise<string> {
  // Fetch app_users row
  const { data: user } = await supabase
    .from('app_users')
    .select('is_18_confirmed, terms_accepted_at, username, display_name, onboarding_status, connection_style_complete')
    .eq('id', userId)
    .maybeSingle();

  if (!user) return '/onboarding/age-consent';
  if (user.onboarding_status === 'complete') return '/(tabs)/nest';

  // Check each step in order
  if (!user.is_18_confirmed) return '/onboarding/age-consent';
  if (!user.terms_accepted_at) return '/onboarding/legal-consent';
  if (!user.username || !user.display_name) return '/onboarding/create-identity';

  // Check profile row
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!profile) return '/onboarding/profile-setup';

  // Check privacy_settings row — created by privacy-preferences screen
  const { data: privData } = await supabase
    .from('privacy_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!privData) return '/onboarding/privacy-preferences';

  // Check dating_preferences row
  const { data: dating } = await supabase
    .from('dating_preferences')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!dating) return '/onboarding/dating-preferences';

  // Last step before complete
  return '/onboarding/introduction-opt-in';
}

export default function Index() {
  const { isAuthenticated, onboardingComplete, isLoading, appUser } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !appUser?.id) {
      router.replace('/welcome');
      return;
    }

    if (onboardingComplete) {
      router.replace('/(tabs)/nest');
      return;
    }

    // Mid-onboarding resume: check which step they're on
    getOnboardingResumeRoute(appUser.id).then((route) => {
      router.replace(route as any);
    });
  }, [isAuthenticated, onboardingComplete, isLoading, appUser?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={Colors.blush[500]} />
    </View>
  );
}

