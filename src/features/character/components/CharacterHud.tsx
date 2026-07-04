import { useRouter } from 'expo-router';
import { Coins, Flame, Heart, LogOut, Shield, Skull, Zap } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useActiveBuffs } from '@/features/store/hooks/useStore';
import { useAuth } from '@/providers/AuthProvider';
import { theme } from '@/theme/theme';
import { initialsFromName, levelProgress } from '@/utils/leveling';
import { useCharacter, useProfile } from '../hooks/useCharacter';
import { StatPill } from './StatPill';

function formatRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expirado';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days}d`;
  const hours = Math.ceil(ms / 3_600_000);
  return `${hours}h`;
}

export function CharacterHud() {
  const { signOut } = useAuth();
  const router = useRouter();
  const character = useCharacter();
  const profile = useProfile();
  const buffs = useActiveBuffs();

  if (character.isLoading) {
    return (
      <Card style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </Card>
    );
  }
  if (character.error || !character.data) {
    return (
      <Card>
        <Text color={theme.colors.hp}>Não foi possível carregar o personagem.</Text>
      </Card>
    );
  }

  const c = character.data;
  const name = profile.data?.display_name ?? 'Aventureiro';
  const level = c.level ?? 1;
  const maxHp = c.max_hp ?? 0;
  const xp = levelProgress(c.total_xp, level);
  const hpRatio = maxHp > 0 ? c.current_hp / maxHp : 0;

  return (
    <Card>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push('/(app)/character')}
          accessibilityRole="button"
          accessibilityLabel="Abrir personagem e build"
          style={styles.identity}
        >
          <View style={styles.avatar}>
            <Text variant="h2" color={theme.colors.textInverse}>
              {initialsFromName(name)}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text variant="title" numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.levelBadge}>
              <Text variant="label" color={theme.colors.primary}>
                Nível {level}
              </Text>
            </View>
          </View>
        </Pressable>
        <Pressable
          onPress={signOut}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Sair"
          style={styles.logout}
        >
          <LogOut color={theme.colors.textMuted} size={20} />
        </Pressable>
      </View>

      <View style={styles.barBlock}>
        <View style={styles.barLabelRow}>
          <View style={styles.barLabel}>
            <Heart color={theme.colors.hp} size={14} />
            <Text variant="label" color={theme.colors.text}>
              HP
            </Text>
          </View>
          <Text variant="bodyMuted">
            {c.current_hp}/{maxHp}
          </Text>
        </View>
        <ProgressBar progress={hpRatio} color={theme.colors.hp} height={theme.sizes.hudBarHeight} />
      </View>

      <View style={styles.barBlock}>
        <View style={styles.barLabelRow}>
          <View style={styles.barLabel}>
            <Zap color={theme.colors.xp} size={14} />
            <Text variant="label" color={theme.colors.text}>
              XP
            </Text>
          </View>
          <Text variant="bodyMuted">
            {xp.into}/{xp.span}
          </Text>
        </View>
        <ProgressBar progress={xp.ratio} color={theme.colors.xp} height={theme.sizes.hudBarHeight} />
      </View>

      <View style={styles.statsRow}>
        <StatPill
          icon={<Coins color={theme.colors.gold} size={20} />}
          value={c.gold}
          label="Ouro"
          color={theme.colors.gold}
        />
        <StatPill
          icon={<Flame color={theme.colors.primary} size={20} />}
          value={c.character_streak ?? 0}
          label="Streak"
          color={theme.colors.primary}
        />
        <StatPill
          icon={<Skull color={theme.colors.textMuted} size={20} />}
          value={c.death_count}
          label="Mortes"
        />
      </View>

      {(buffs.data ?? []).map((b) => (
        <View key={b.id} style={styles.buffRow}>
          <Shield color={theme.colors.skill} size={16} />
          <Text variant="bodyMuted" color={theme.colors.skill}>
            Escudo {b.effect_value}% — expira em {formatRemaining(b.expires_at)}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBright,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, gap: theme.spacing.xs },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryDim,
    borderWidth: 1,
    borderColor: theme.colors.primaryBright,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  logout: { padding: theme.spacing.sm },
  barBlock: { marginTop: theme.spacing.lg, gap: theme.spacing.xs },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  statsRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  buffRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.md },
});
