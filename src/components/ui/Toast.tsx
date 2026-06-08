import { CheckCircle2, CircleAlert, Info, TriangleAlert } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme/theme';
import { Text } from './Text';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastPayload = {
  title: string;
  message?: string;
  type?: ToastType;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (toast: ToastPayload) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TYPE_META: Record<ToastType, { color: string; icon: ReactNode }> = {
  success: { color: theme.colors.success, icon: <CheckCircle2 color={theme.colors.success} size={20} /> },
  error: { color: theme.colors.hp, icon: <CircleAlert color={theme.colors.hp} size={20} /> },
  info: { color: theme.colors.skill, icon: <Info color={theme.colors.skill} size={20} /> },
  warning: { color: theme.colors.xp, icon: <TriangleAlert color={theme.colors.xp} size={20} /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastPayload & { id: number; type: ToastType }) | null>(null);

  const showToast = useCallback((payload: ToastPayload) => {
    setToast({ ...payload, id: Date.now(), type: payload.type ?? 'info' });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), toast.durationMs ?? 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (title, message) => showToast({ title, message, type: 'success' }),
      error: (title, message) => showToast({ title, message, type: 'error', durationMs: 4200 }),
      info: (title, message) => showToast({ title, message, type: 'info' }),
      warning: (title, message) => showToast({ title, message, type: 'warning' }),
    }),
    [showToast],
  );

  const meta = toast ? TYPE_META[toast.type] : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && meta ? (
        <Pressable style={styles.wrap} onPress={() => setToast(null)} accessibilityRole="button">
          <View style={[styles.toast, { borderLeftColor: meta.color }]}>
            {meta.icon}
            <View style={styles.copy}>
              <Text variant="bodyMedium">{toast.title}</Text>
              {toast.message ? (
                <Text variant="bodyMuted" numberOfLines={2}>
                  {toast.message}
                </Text>
              ) : null}
            </View>
          </View>
        </Pressable>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: 96,
    zIndex: 1000,
  },
  toast: {
    minHeight: 58,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  copy: { flex: 1, gap: 2 },
});
