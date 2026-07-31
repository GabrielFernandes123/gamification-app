import type { ToastPayload } from '@/components/ui/Toast';
import type { BossProgressResult } from '@/types/rpc';

type ToastApi = {
  showToast: (toast: ToastPayload) => void;
};

export function showBossProgressToast(toast: ToastApi, bossProgress: BossProgressResult | undefined) {
  if (!bossProgress) return;

  const totalDamage =
    bossProgress.totalDamage ?? (bossProgress.damage ?? 0) + (bossProgress.objectiveDamage ?? 0);

  if (bossProgress.defeated) {
    toast.showToast({
      type: 'success',
      title: 'Boss derrotado',
      message: totalDamage > 0 ? `${totalDamage} de dano no golpe final.` : 'Recompensas liberadas.',
      durationMs: 4200,
    });
    return;
  }

  if (totalDamage > 0) {
    // Crítico e fraqueza no TÍTULO, não no rodapé: são a razão de o número ser
    // aquele. Um golpe que dobrou sem dizer por que dobrou é mecânica invisível —
    // e mecânica que o jogador não vê acontecer não muda decisão nenhuma.
    const marca = bossProgress.wasCritical
      ? 'CRÍTICO! '
      : bossProgress.wasWeakness
        ? 'Fraqueza! '
        : '';
    const detalhes = [
      bossProgress.bossCurrentHp != null && bossProgress.bossMaxHp != null
        ? `HP restante: ${bossProgress.bossCurrentHp}/${bossProgress.bossMaxHp}`
        : null,
      // No crítico a fraqueza também vale a linha: foram os dois multiplicadores.
      bossProgress.wasCritical && bossProgress.wasWeakness ? 'fraqueza explorada' : null,
    ].filter(Boolean);

    toast.showToast({
      type: 'info',
      title: `${marca}${totalDamage} de dano no boss`,
      message: detalhes.length > 0 ? detalhes.join(' · ') : undefined,
    });
  }
}
