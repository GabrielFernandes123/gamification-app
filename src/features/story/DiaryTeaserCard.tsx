import { useRouter, type Href } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';
import { useDiaryEntries } from './DiaryBookScreen';

/**
 * A última entrada do diário, na Início — e a porta do livro.
 *
 * Mostra só o começo: a entrada inteira é leitura, e leitura tem lugar próprio.
 * O que este cartão faz é lembrar que existe alguém escrevendo — e, no dia
 * seguinte a um fechamento, dar o gancho para abrir o livro.
 *
 * Some quando não há entrada nenhuma, como todo cartão desta tela.
 */
export function DiaryTeaserCard() {
  const entries = useDiaryEntries();
  const router = useRouter();
  const ultima = entries.data?.[0];
  if (!ultima) return null;

  const previa = ultima.content.split(/\n+/)[0]?.slice(0, 160) ?? '';

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <BookOpen size={16} color={theme.colors.primary} />
        <View style={styles.headText}>
          <Text variant="title">{ultima.title ?? 'A última página'}</Text>
          {ultima.floor_number ? (
            <Text variant="bodyMuted">
              Andar {ultima.floor_number}
              {ultima.floor_name ? ` — ${ultima.floor_name}` : ''}
            </Text>
          ) : null}
        </View>
      </View>
      <Text variant="bodyMuted" numberOfLines={3}>
        {previa}…
      </Text>
      <Button
        label="Ler o livro"
        variant="outline"
        fullWidth
        // O cast existe porque as rotas tipadas do Expo Router são GERADAS
        // quando o servidor de desenvolvimento sobe: uma rota criada com o
        // servidor parado ainda não existe para o TypeScript. Some sozinho no
        // primeiro `expo start`.
        onPress={() => router.push('/(app)/livro' as Href)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  head: { flexDirection: 'row', gap: theme.spacing.sm },
  headText: { flex: 1, gap: 2 },
});
