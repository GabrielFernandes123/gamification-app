import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/providers/AuthProvider';
import { theme } from '@/theme/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Traduz/humaniza erros comuns do Supabase Auth para pt-BR.
function friendlyAuthError(message: string) {
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  return message;
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    // Validação local antes de chamar o servidor.
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Informe e-mail e senha.');
      return;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      setError('Informe um e-mail válido.');
      return;
    }
    setError(null);
    setLoading(true);
    const res = await signIn(cleanEmail, password);
    setLoading(false);
    if (res.error) setError(friendlyAuthError(res.error));
    // sucesso: onAuthStateChange atualiza a sessão e o layout redireciona.
  }

  return (
    <Screen scroll keyboard contentStyle={styles.content}>
      <Card accent={theme.colors.primary} style={styles.header}>
        <Text variant="display" color={theme.colors.primary}>
          EVOLVE
        </Text>
        <Text variant="bodyMuted">Sua evolução, gamificada.</Text>
      </Card>

      <Card style={styles.form}>
        <Input
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="seu@email.com"
        />
        <Input
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        {error ? <Text color={theme.colors.hp}>{error}</Text> : null}
        <Button label="Entrar" onPress={onSubmit} loading={loading} fullWidth />
      </Card>

      <View style={styles.footer}>
        <Text variant="bodyMuted">Não tem conta? </Text>
        <Link href="/(auth)/signup">
          <Text color={theme.colors.primary}>Criar conta</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', gap: theme.spacing.lg },
  header: { gap: theme.spacing.xs },
  form: { gap: theme.spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
