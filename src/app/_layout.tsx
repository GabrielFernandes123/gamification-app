import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import {
  ChakraPetch_400Regular,
  ChakraPetch_500Medium,
  ChakraPetch_600SemiBold,
  ChakraPetch_700Bold,
} from '@expo-google-fonts/chakra-petch';
import { RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

// Efeito colateral de propósito: registra a tarefa em segundo plano no escopo
// global, na carga do bundle. Quando o iOS acorda o app em segundo plano,
// nenhuma tela é montada — definir a tarefa dentro de um componente a perderia.
import '@/features/background/backgroundRefresh';
import { attachLiveActivityListeners } from '@/features/live/liveActivities';
import { AppProviders } from '@/providers/AppProviders';
import { theme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();

// Na CARGA do bundle, como a tarefa em segundo plano: quando o iOS começa uma
// Live Activity por push e acorda o app para entregar o token dela, nenhuma
// tela é montada — o ouvinte precisa já estar ligado.
attachLiveActivityListeners();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    // Identidade própria da tela de História (arco narrativo imersivo).
    RussoOne_400Regular,
    ChakraPetch_400Regular,
    ChakraPetch_500Medium,
    ChakraPetch_600SemiBold,
    ChakraPetch_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AppProviders>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </AppProviders>
  );
}
