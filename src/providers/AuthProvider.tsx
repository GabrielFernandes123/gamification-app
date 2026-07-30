import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { clearCachedToken } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { clearTodayJourneyWidgetSnapshot } from '@/features/widgets/useTodayJourneyWidget';
import { revokePushToken } from '@/features/notifications/pushToken';

type AuthResult = { error?: string };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) {
        clearTodayJourneyWidgetSnapshot();
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession((prev) => {
        // Zera o token em cache no logout ou troca de usuário no mesmo aparelho.
        if (event === 'SIGNED_OUT' || (newSession?.user?.id && prev?.user?.id && newSession.user.id !== prev.user.id)) {
          clearCachedToken();
          clearTodayJourneyWidgetSnapshot();
        }
        return newSession;
      });
    });

    // Auto-refresh do token só com app em foreground (recomendação Supabase RN).
    supabase.auth.startAutoRefresh();
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      sub.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message };
      },
      signUp: async (email, password, displayName) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: displayName ? { display_name: displayName } : undefined },
        });
        return { error: error?.message };
      },
      signOut: async () => {
        // ANTES do signOut: a rota é autenticada, e revogar depois receberia
        // 401 em silêncio. Sem isto o token do aparelho ficava vivo e o
        // próximo usuário desta conta recebia as notificações do anterior.
        await revokePushToken();
        await supabase.auth.signOut();
        clearCachedToken(); // zera Bearer em cache p/ não vazar entre usuários
        queryClient.clear(); // limpa cache p/ não vazar dados entre sessões
        clearTodayJourneyWidgetSnapshot();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
