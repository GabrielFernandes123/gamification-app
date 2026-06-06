import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { theme } from '@/theme/theme';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="habits/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="habits/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="skills/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="skills/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="rewards/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="rewards/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="achievements" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="sidequests/index" />
      <Stack.Screen name="sidequests/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="sidequests/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
