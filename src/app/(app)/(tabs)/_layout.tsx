import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import { Dumbbell, Home, ShoppingBag, Target } from 'lucide-react-native';
import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';

import { useNotificationSync } from '@/features/notifications/useNotificationSync';
import { theme } from '@/theme/theme';

// Botão central: a logo do app, flutuando acima da tab bar.
function HistoriaIcon({ focused }: { focused: boolean }) {
  return (
    <Image
      source={require('../../../../assets/logo.png')}
      style={[styles.historiaLogo, focused && styles.historiaLogoOn]}
      resizeMode="contain"
    />
  );
}

export default function TabsLayout() {
  useNotificationSync();
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const habitId = response.notification.request.content.data?.habitId;
      if (typeof habitId === 'string') {
        router.navigate({ pathname: '/(app)/habits/[id]', params: { id: habitId } });
        return;
      }
      const route = response.notification.request.content.data?.route;
      if (route === '/(app)/(tabs)/body') {
        router.navigate('/(app)/(tabs)/body');
        return;
      }
      router.navigate('/(app)/(tabs)/habits');
    });
    return () => sub.remove();
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 72,
          overflow: 'visible',
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: theme.fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Hábitos',
          tabBarIcon: ({ color, size }) => <Target color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="historia"
        options={{
          title: 'História',
          tabBarItemStyle: styles.historiaTab,
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <HistoriaIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          title: 'Corpo',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Loja',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  historiaLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -32,
    opacity: 0.82,
    borderWidth: 2,
    borderColor: 'rgba(167,139,250,0.45)',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  historiaLogoOn: {
    opacity: 1,
    borderWidth: 3,
    borderColor: '#A78BFA',
    shadowOpacity: 0.75,
    transform: [{ scale: 1.14 }],
  },
  historiaTab: { justifyContent: 'center' },
});
