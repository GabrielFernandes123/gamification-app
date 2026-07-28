import { Image as ExpoImage } from 'expo-image';
import { X } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme/theme';
import { Text } from './Text';

/**
 * Mídia do exercício em tela cheia.
 *
 * O thumb da execução tem 44-56px e usa `contentFit="cover"` — bom para
 * reconhecer o exercício na lista, inútil para CONFERIR o movimento. Aqui é
 * `contain`, sem corte, e o gif anima sozinho (expo-image toca GIF/WebP nativo,
 * sem player).
 *
 * Fecha em qualquer toque: no meio de uma série ninguém quer procurar botão.
 */
export function MediaViewer({
  uri,
  title,
  onClose,
}: {
  uri: string | null;
  title?: string | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.header}>
          <Text variant="title" color={theme.colors.textInverse} numberOfLines={1} style={styles.flex}>
            {title ?? 'Exercício'}
          </Text>
          <X color={theme.colors.textInverse} size={22} />
        </View>
        {uri ? <ExpoImage source={{ uri }} style={styles.image} contentFit="contain" /> : null}
        <Text variant="bodyMuted" color={theme.colors.textInverse}>
          Toque para fechar
        </Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    alignSelf: 'stretch',
  },
  flex: { flex: 1 },
  image: { width: '100%', flex: 1, borderRadius: theme.radius.md },
});
