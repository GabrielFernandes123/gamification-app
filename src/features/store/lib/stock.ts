import type { Reward } from '../hooks/useStore';

/** Momento (ms epoch) em que o cooldown da recompensa termina, ou null se não há cooldown ativo. */
export function getCooldownUntil(reward: Reward): number | null {
  if (!reward.cooldown_minutes || !reward.last_purchased_at) return null;
  return new Date(reward.last_purchased_at).getTime() + reward.cooldown_minutes * 60_000;
}

/**
 * Estoque efetivo considerando o restock por cooldown (espelho da regra do servidor).
 * `now` em ms epoch; com `now = 0` o cooldown é tratado como ainda ativo.
 */
export function getEffectiveStock(reward: Reward, now: number = Date.now()): number {
  if (!reward.has_stock) return Number.POSITIVE_INFINITY;
  const current = reward.current_stock ?? 0;
  if (current > 0) return current;
  const until = getCooldownUntil(reward);
  if (until == null) return current;
  return until <= now ? (reward.max_stock ?? 0) : current;
}
