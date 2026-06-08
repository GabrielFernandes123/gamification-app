import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/providers/AuthProvider';
import { theme } from '@/theme/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const res = await signIn(email.trim(), password);
    setLoading(false);
    if (res.error) setError(res.error);
    // sucesso: onAuthStateChange atualiza a sessão e o layout redireciona.
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="display" color={theme.colors.primary}>
          EVOLVE
        </Text>
        <Text variant="bodyMuted">Sua evolução, gamificada.</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="voce@email.com"
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
      </View>

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
  content: { flexGrow: 1, justifyContent: 'center', gap: theme.spacing.xxl },
  header: { alignItems: 'center', gap: theme.spacing.xs },
  form: { gap: theme.spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
