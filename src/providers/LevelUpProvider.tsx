import { Star } from 'lucide-react-native';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';

type LevelUpContextValue = { celebrate: (level: number) => void };

const LevelUpContext = createContext<LevelUpContextValue>({ celebrate: () => {} });

export function LevelUpProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<number | null>(null);
  const celebrate = useCallback((l: number) => setLevel(l), []);

  return (
    <LevelUpContext.Provider value={{ celebrate }}>
      {children}
      <Modal visible={level != null} transparent animationType="fade" onRequestClose={() => setLevel(null)}>
        <Pressable style={styles.backdrop} onPress={() => setLevel(null)}>
          <View style={styles.card}>
            <View style={styles.starWrap}>
              <Star color={theme.colors.gold} size={64} fill={theme.colors.gold} />
            </View>
            <Text variant="display" color={theme.colors.primary}>
              {level}
            </Text>
            <Text variant="h2">Subiu de nível!</Text>
            <Text variant="bodyMuted" style={styles.hint}>
              Toque para continuar
            </Text>
          </View>
        </Pressable>
      </Modal>
    </LevelUpContext.Provider>
  );
}

export function useLevelUp() {
  return useContext(LevelUpContext);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
    borderWidth: 2,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  starWrap: { marginBottom: theme.spacing.sm },
  hint: { marginTop: theme.spacing.md },
});
