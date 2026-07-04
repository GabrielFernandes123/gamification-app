import { Skull } from 'lucide-react-native';
import { Modal, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';

// Modal de morte (HP zerou). A mensagem depende do modo de morte do
// personagem: seasonal (penalidades parciais) vs hardcore (reset completo).
// Modal RN (funciona em web) — nunca Alert.alert.
type Props = {
  visible: boolean;
  mode: string | null | undefined; // 'seasonal' | 'hardcore'
  onClose: () => void;
};

export function DeathModal({ visible, mode, onClose }: Props) {
  const hardcore = mode === 'hardcore';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card accent={theme.colors.hp} style={styles.card}>
          <View style={styles.iconWrap}>
            <Skull color={theme.colors.hp} size={34} />
          </View>
          <Text variant="h1" color={theme.colors.hp}>
            Você morreu
          </Text>
          <Text variant="bodyMuted">Seu HP chegou a zero.</Text>

          {hardcore ? (
            <View style={styles.consequences}>
              <Consequence text="Modo hardcore: o personagem foi resetado." />
              <Consequence text="Nível, XP, ouro e sequências voltam ao início." />
            </View>
          ) : (
            <View style={styles.consequences}>
              <Consequence text="Você perde 25% do ouro." />
              <Consequence text="HP volta a 35% do máximo." />
              <Consequence text="Sequências caem pela metade." />
              <Consequence text="Nível e XP são mantidos." />
            </View>
          )}

          <Button label="Continuar" variant="danger" onPress={onClose} fullWidth />
        </Card>
      </View>
    </Modal>
  );
}

function Consequence({ text }: { text: string }) {
  return (
    <View style={styles.consequenceRow}>
      <View style={styles.dot} />
      <Text variant="body" style={styles.consequenceText}>
        {text}
      </Text>
    </View>
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
    width: 58,
    height: 58,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.hp,
    backgroundColor: theme.colors.hp + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consequences: {
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.md,
  },
  consequenceRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.hp },
  consequenceText: { flex: 1 },
});
