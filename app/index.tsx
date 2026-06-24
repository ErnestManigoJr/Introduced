import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator } from 'react-native';
import { Theme, Colors } from '../src/constants/colors';

export default function Index() {
  const { isAuthenticated, onboardingComplete, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/welcome');
    } else if (!onboardingComplete) {
      router.replace('/onboarding/age-consent');
    } else {
      router.replace('/(tabs)/nest');
    }
  }, [isAuthenticated, onboardingComplete, isLoading]);

  return (
    <View style={{ flex: 1, backgroundColor: Theme.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={Colors.blush[500]} />
    </View>
  );
}
