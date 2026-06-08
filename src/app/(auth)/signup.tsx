import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/providers/AuthProvider';
import { theme } from '@/theme/theme';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (password.length < 6) {
      setError('A senha precisa ter ao menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const res = await signUp(email.trim(), password, name.trim() || undefined);
    setLoading(false);
    if (res.error) setError(res.error);
    // sucesso (confirm email desabilitado): sessão criada -> redireciona.
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="display" color={theme.colors.primary}>
          EVOLVE
        </Text>
        <Text variant="bodyMuted">Crie seu personagem.</Text>
      </View>

      <View style={styles.form}>
        <Input label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
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
          placeholder="mínimo 6 caracteres"
        />
        {error ? <Text color={theme.colors.hp}>{error}</Text> : null}
        <Button label="Criar conta" onPress={onSubmit} loading={loading} fullWidth />
      </View>

      <View style={styles.footer}>
        <Text variant="bodyMuted">Já tem conta? </Text>
        <Link href="/(auth)/login">
          <Text color={theme.colors.primary}>Entrar</Text>
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
