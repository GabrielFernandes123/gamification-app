import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/providers/AuthProvider';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Redirect href="/(app)/(tabs)/dashboard" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
