import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Gift, Heart, Swords, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';

// Onboarding mínimo do primeiro login: 4 passos explicando o modelo do jogo.
// A flag fica no AsyncStorage (mesmo storage do resto do app) — quando não
// existe, o modal aparece por cima do dashboard.
const ONBOARDING_STORAGE_KEY = '@gamificacao/onboarding/v1';

type Step = {
  key: string;
  Icon: ComponentType<{ color: string; size: number }>;
  color: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    key: 'habits',
    Icon: Zap,
    color: theme.colors.xp,
    title: 'Seus hábitos são sua força',
    body:
      'Cada hábito cumprido rende XP e ouro. Mas cuidado: falhar num hábito causa dano direto ao seu HP. A vida real vira o jogo.',
  },
  {
    key: 'death',
    Icon: Heart,
    color: theme.colors.hp,
    title: 'HP zerado = morte',
    body:
      'Se o HP chegar a zero, você morre — e paga o preço conforme o modo escolhido: da penalidade leve ao reset hardcore. Proteja sua vida cumprindo o básico.',
  },
  {
    key: 'boss',
    Icon: Swords,
    color: theme.colors.primary,
    title: 'O boss da temporada',
    body:
      'Todo progresso seu vira dano no boss da temporada. Dias ruins fazem ele contra-atacar. Derrote-o antes do fim da janela para ganhar as recompensas do arco.',
  },
  {
    key: 'store',
    Icon: Gift,
    color: theme.colors.gold,
    title: 'Gaste o ouro com prazer',
    body:
      'O ouro conquistado compra recompensas reais na Loja — as que você mesmo cadastra. Esforço de um lado, regalia do outro.',
  },
];

export function OnboardingModal() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((raw) => {
        if (active && raw == null) setVisible(true);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const finish = useCallback((goToHabitForm: boolean) => {
    AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, new Date().toISOString()).catch(() => undefined);
    setVisible(false);
    if (goToHabitForm) router.push('/(app)/habits/new');
  }, [router]);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.Icon;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => finish(false)}>
      <View style={styles.backdrop}>
        <Card accent={current.color} style={styles.card}>
          <View style={[styles.iconWrap, { borderColor: current.color }]}>
            <Icon color={current.color} size={34} />
          </View>

          <Text variant="label" color={current.color}>
            Bem-vindo à aventura · {step + 1}/{STEPS.length}
          </Text>
          <Text variant="h1">{current.title}</Text>
          <Text variant="bodyMuted">{current.body}</Text>

          <View style={styles.dots}>
            {STEPS.map((s, i) => (
              <View
                key={s.key}
                style={[
                  styles.dot,
                  i === step ? { backgroundColor: current.color, width: 18 } : null,
                ]}
              />
            ))}
          </View>

          {isLast ? (
            <View style={styles.actions}>
              <Button label="Criar meu primeiro hábito" onPress={() => finish(true)} fullWidth />
              <Pressable
                onPress={() => finish(false)}
                accessibilityRole="button"
                style={styles.skip}
              >
                <Text variant="bodyMuted">Explorar por conta própria</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.row}>
              {step > 0 ? (
                <Button label="Voltar" variant="outline" onPress={() => setStep(step - 1)} />
              ) : (
                <Pressable
                  onPress={() => finish(false)}
                  accessibilityRole="button"
                  style={styles.skip}
                >
                  <Text variant="bodyMuted">Pular</Text>
                </Pressable>
              )}
              <View style={styles.flex} />
              <Button label="Avançar" onPress={() => setStep(step + 1)} />
            </View>
          )}
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: { gap: theme.spacing.md },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  dots: { flexDirection: 'row', gap: theme.spacing.xs, marginVertical: theme.spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  flex: { flex: 1 },
  actions: { gap: theme.spacing.sm },
  skip: { minHeight: theme.sizes.touch, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
});
