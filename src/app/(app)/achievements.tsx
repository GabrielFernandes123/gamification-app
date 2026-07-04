import { useRouter } from 'expo-router';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { ACHIEVEMENTS } from '@/features/achievements/catalog';
import { useAchievements, useEvaluateAchievements } from '@/features/achievements/useAchievements';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';

const ACHIEVEMENT_TITLE = new Map(ACHIEVEMENTS.map((a) => [a.key, a.title] as const));

export default function AchievementsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: unlocked, isLoading } = useAchievements();
  const evaluate = useEvaluateAchievements();

  const total = ACHIEVEMENTS.length;
  const count = unlocked ? Object.keys(unlocked).length : 0;

  function onEvaluate() {
    evaluate.mutate(undefined, {
      onSuccess: (newKeys) => {
        if ((newKeys ?? []).length > 0) {
          const titles = newKeys.map((k) => ACHIEVEMENT_TITLE.get(k) ?? k).join(', ');
          toast.success(
            `${newKeys.length} nova(s) conquista(s)!`,
            titles,
          );
        } else {
          toast.info('Tudo em dia', 'Nenhuma conquista nova por enquanto.');
        }
      },
      onError: (e) => toast.error('Erro ao verificar', formatErrorMessage(e)),
    });
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar" style={styles.iconBtn}>
          <ChevronLeft color={theme.colors.text} size={26} />
        </Pressable>
        <Text variant="h1">Conquistas</Text>
        <Pressable
          onPress={onEvaluate}
          disabled={evaluate.isPending}
          hitSlop={10}
          accessibilityLabel="Verificar conquistas"
          style={styles.iconBtn}
        >
          {evaluate.isPending ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <RefreshCw color={theme.colors.textMuted} size={20} />
          )}
        </Pressable>
      </View>

      <Text variant="bodyMuted" style={styles.progress}>
        {count} de {total} desbloqueadas
      </Text>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <View style={styles.grid}>
          {ACHIEVEMENTS.map((a) => {
            const isUnlocked = !!unlocked?.[a.key];
            const Icon = a.icon;
            return (
              <Card key={a.key} style={[styles.card, !isUnlocked && styles.locked]}>
                <Icon color={isUnlocked ? a.color : theme.colors.textMuted} size={28} />
                <Text variant="bodyMedium" color={isUnlocked ? theme.colors.text : theme.colors.textMuted}>
                  {a.title}
                </Text>
                <Text variant="bodyMuted" style={styles.desc}>
                  {a.description}
                </Text>
                {isUnlocked && (
                  <Text variant="label" color={a.color}>
                    Desbloqueada
                  </Text>
                )}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  card: { flexBasis: '47%', flexGrow: 1, gap: theme.spacing.xs, alignItems: 'flex-start', minHeight: 150 },
  locked: { opacity: 0.5 },
  desc: { minHeight: 36 },
});
