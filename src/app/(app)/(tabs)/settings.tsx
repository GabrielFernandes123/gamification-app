import { ExternalLink, LogOut } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { PermissionsPanel } from '@/features/permissions/PermissionsPanel';
import { ShieldPanel } from '@/features/tracking/ios/ShieldPanel';
import { openWeb } from '@/lib/openWeb';
import { useAuth } from '@/providers/AuthProvider';
import { theme } from '@/theme/theme';

/**
 * Ajustes do app — e só o que é do APARELHO.
 *
 * Esta tela já foi a cópia inteira das configurações do web: nome, fuso, metas
 * de XP/ouro, modo de morte, avisos do corpo, hábitos inativos e o reset de
 * progresso. Tudo isso saiu (doc 08 §0): configurar é decisão pensada, feita
 * sentado, e viver em dois lugares só criava manutenção dupla e a dúvida de
 * qual dos dois estava certo.
 *
 * Ficou o que o navegador **não consegue**:
 * - **permissões**, que são do sistema operacional;
 * - o **escudo do iPhone**, cujo seletor de apps devolve um token opaco que só
 *   existe dentro do aparelho.
 *
 * É uma ABA, e não mais um empilhado atrás da engrenagem da Início: permissão
 * negada é a causa silenciosa de notificação que não chega e de escudo que não
 * aplica, e caçar isso não pode depender de lembrar de um ícone no canto.
 * Por ser aba, a tela não tem botão de voltar — a barra é o caminho de volta.
 */
export default function SettingsScreen() {
  const { signOut } = useAuth();

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Text variant="h1">Ajustes</Text>
      </View>

      <PermissionsPanel />

      <ShieldPanel />

      <Card style={styles.webCard}>
        <View>
          <Text variant="title">Configurações do personagem</Text>
          <Text variant="bodyMuted">
            Nome, fuso, metas do dia, modo de morte, avisos do corpo e hábitos
            arquivados ficam no site — são decisões de mesa, não de bolso.
          </Text>
        </View>
        <Button
          label="Abrir no site"
          variant="outline"
          icon={<ExternalLink color={theme.colors.text} size={16} />}
          onPress={() => void openWeb('/settings')}
          fullWidth
        />
      </Card>

      <Button
        label="Sair"
        variant="danger"
        icon={<LogOut color={theme.colors.textInverse} size={18} />}
        onPress={signOut}
        fullWidth
        style={styles.signOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  webCard: { gap: theme.spacing.md },
  signOut: { marginTop: theme.spacing.lg },
});
