import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useHealthSyncRunner } from '@/features/health/useHealthSync';
import { useShieldSyncRunner } from '@/features/tracking/ios/useShieldSync';
import { useAuth } from '@/providers/AuthProvider';
import { theme } from '@/theme/theme';

export default function AppLayout() {
  const { session, loading } = useAuth();

  // Bloqueio do iPhone: sincroniza aqui, e não numa tela, porque o shield e a
  // política do Safari precisam ser reescritos sempre que o app abre — mesmo
  // que o usuário nunca visite Tempo de tela.
  useShieldSyncRunner(Boolean(session));

  // Sono: o HealthKit é lido na abertura e a cada volta ao primeiro plano. Sem
  // o módulo nativo (build anterior ao HealthKit) isto é um no-op silencioso.
  useHealthSyncRunner(Boolean(session));

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
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
        animation: 'slide_from_right',
        presentation: 'card',
      }}
    >
      {/* App = REGISTRO EM MOVIMENTO (doc 08). Consulta, análise e gestão —
          História, Loja, Personagem, Estatísticas, Conquistas, Skills, Side
          quests, Histórico, builder de treino e config de tempo de tela — vivem
          só no web; o caminho até elas passa pelo `openWeb()`. */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="body/workouts/[id]" />
    </Stack>
  );
}
