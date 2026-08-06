import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import { Dumbbell, Home, NotebookPen, Repeat2, Settings } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { useModulesEnabled } from '@/features/modules/useModules';
import { useNotificationActions } from '@/features/notifications/useNotificationActions';
import { useNotificationSync } from '@/features/notifications/useNotificationSync';
import { useTodayJourneySync } from '@/features/widgets/useTodayJourney';
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
  // O botão "Feito" da notificação (análise de simplificação do app (2026-07-30) §4.4). Fica aqui, ao lado
  // dos outros sincronizadores, porque também é "o mundo de fora agindo sobre o
  // estado de dentro" — e precisa valer com o app aberto em qualquer aba.
  useNotificationActions();
  // Aqui, e não na Início: o widget precisa valer para quem abre o app direto
  // em Hábitos. Fica ao lado do sync de notificação porque é o mesmo tipo de
  // coisa — sincronizar o mundo de fora com o estado de dentro.
  useTodayJourneySync();
  const router = useRouter();

  // ── ABA DE MÓDULO DESLIGADO SOME (06 §9.15) ────────────────────────────
  // Home e Ajustes nunca somem: uma é a porta do app e a outra é de onde se
  // religa o resto. As três do meio são módulos, e cada uma responde pelas
  // chaves que a sua tela de fato registra.
  //
  // `href: null` esconde a aba E torna a rota inalcançável pelo roteador — que
  // é o que faz isto valer também para o toque na notificação, que navega por
  // caminho e não pelo botão.
  const mostrarRotina = useModulesEnabled(['habit']);
  const mostrarCorpo = useModulesEnabled([
    'workout',
    'cardio',
    'body_measurement',
    'nutrition',
  ]);
  const mostrarDiario = useModulesEnabled(['journal']);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      // BOTÃO de ação não navega: "Feito" resolve sem trazer o app para a frente
      // (quem trata é o `useNotificationActions`), e navegar aqui arrancaria a
      // tela de quem estava em outra aba. Só o toque no CORPO da notificação —
      // o `DEFAULT_ACTION_IDENTIFIER` — muda de rota.
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        return;
      }
      // As telas de DETALHE saíram do app (doc 08: só registro em movimento),
      // então o toque na notificação leva à aba onde se AGE, não a uma ficha de
      // leitura. Notificação de hábito abre a lista com o botão de marcar.
      //
      // Cada destino confere a aba antes de navegar. Não deveria acontecer — o
      // servidor parou de mandar notificação de módulo desligado —, mas uma
      // notificação pode chegar MINUTOS depois de o módulo ser desligado, e
      // navegar para uma aba com `href: null` não erra: fica na tela atual sem
      // dizer nada, que é o pior jeito de falhar. A Home é o destino de
      // consolo, e ela nunca some.
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && route.includes('body')) {
        router.navigate(mostrarCorpo ? '/(app)/(tabs)/body' : '/(app)/(tabs)/dashboard');
        return;
      }
      if (typeof route === 'string' && route.includes('diario')) {
        router.navigate(mostrarDiario ? '/(app)/(tabs)/diario' : '/(app)/(tabs)/dashboard');
        return;
      }
      router.navigate(mostrarRotina ? '/(app)/(tabs)/habits' : '/(app)/(tabs)/dashboard');
    });
    return () => sub.remove();
  }, [router, mostrarCorpo, mostrarDiario, mostrarRotina]);

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
          href: mostrarRotina ? undefined : null,
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
          href: mostrarCorpo ? undefined : null,
          title: 'Corpo',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Dumbbell color={color} size={20} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="diario"
        options={{
          href: mostrarDiario ? undefined : null,
          title: 'Diário',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <NotebookPen color={color} size={20} />
            </TabIcon>
          ),
        }}
      />
      {/* Ajustes virou ABA em 2026-08-01: era um empilhado atrás da engrenagem
          da Início, e o que mora nele — permissões do sistema e o escudo do
          iPhone — é a causa silenciosa de notificação que não chega. Achar isso
          não pode depender de lembrar de um ícone no canto de outra tela. */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Settings color={color} size={20} />
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
