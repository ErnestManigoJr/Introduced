import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/authStore';
import { Theme } from '../src/constants/colors';

export default function RootLayout() {
  const { setAppUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Bootstrap session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setLoading(true);
        const { data } = await supabase
          .from('app_users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();
        setAppUser(data ?? null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setAppUser(null);
          return;
        }
        if (session?.user) {
          const { data } = await supabase
            .from('app_users')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .single();
          setAppUser(data ?? null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={Theme.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Theme.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="auth/sign-in" />
        <Stack.Screen name="auth/sign-up" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="onboarding/age-consent" />
        <Stack.Screen name="onboarding/legal-consent" />
        <Stack.Screen name="onboarding/create-identity" />
        <Stack.Screen name="onboarding/profile-setup" />
        <Stack.Screen name="onboarding/privacy-preferences" />
        <Stack.Screen name="onboarding/introduction-opt-in" />
        <Stack.Screen name="onboarding/connection-style" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
