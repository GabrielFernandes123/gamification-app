import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import { Backpack, Dumbbell, Home, Repeat2, Swords } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { useNotificationSync } from '@/features/notifications/useNotificationSync';
import { theme } from '@/theme/theme';

function TabIcon({
  focused,
  color,
  children,
}: {
  focused: boolean;
  color: ColorValue;
  children: ReactNode;
}) {
  const tint = String(color);
  return (
    <View
      style={[
        styles.iconShell,
        focused && {
          borderColor: color,
          backgroundColor: tint.startsWith('#') ? `${tint}1F` : 'rgba(250,204,21,0.12)',
        },
      ]}
    >
      {children}
      {focused ? <View style={[styles.iconPulse, { backgroundColor: color }]} /> : null}
    </View>
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
        tabBarActiveTintColor: theme.colors.gold,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Home color={color} size={20} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Rotina',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Repeat2 color={color} size={20} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          title: 'Corpo',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Dumbbell color={color} size={20} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="historia"
        options={{
          title: 'Jornada',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Swords color={color} size={20} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Bolsa',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Backpack color={color} size={20} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 76,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 20,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(2,6,23,0.94)',
    overflow: 'visible',
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  tabItem: {
    minWidth: 0,
    paddingHorizontal: 0,
  },
  tabLabel: {
    fontFamily: theme.fonts.bodySemibold,
    fontSize: 11,
    marginTop: 3,
  },
  iconShell: {
    width: 38,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPulse: {
    position: 'absolute',
    bottom: -5,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
