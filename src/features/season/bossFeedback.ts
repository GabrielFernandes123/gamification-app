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
    toast.showToast({
      type: 'info',
      title: `${totalDamage} de dano no boss`,
      message:
        bossProgress.bossCurrentHp != null && bossProgress.bossMaxHp != null
          ? `HP restante: ${bossProgress.bossCurrentHp}/${bossProgress.bossMaxHp}`
          : undefined,
    });
  }
}
