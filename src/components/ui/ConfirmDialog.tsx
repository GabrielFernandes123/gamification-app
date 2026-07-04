import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { theme } from '@/theme/theme';
import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

// Diálogo de confirmação próprio (Modal RN) — Alert.alert com botões é no-op
// no react-native-web, então confirmações precisam deste padrão.
export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // Se já houver um diálogo aberto, resolve o anterior como cancelado.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setOptions(next);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        visible={!!options}
        transparent
        animationType="fade"
        onRequestClose={() => settle(false)}
      >
        <View style={styles.backdrop}>
          <Card
            accent={options?.destructive ? theme.colors.hp : theme.colors.primary}
            style={styles.card}
          >
            <Text variant="h2">{options?.title}</Text>
            {options?.message ? <Text variant="bodyMuted">{options.message}</Text> : null}
            <View style={styles.actions}>
              <Button
                label={options?.cancelLabel ?? 'Cancelar'}
                variant="outline"
                onPress={() => settle(false)}
              />
              <Button
                label={options?.confirmLabel ?? 'Confirmar'}
                variant={options?.destructive ? 'danger' : 'primary'}
                onPress={() => settle(true)}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx.confirm;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: { gap: theme.spacing.md },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});
