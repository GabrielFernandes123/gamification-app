import * as Notifications from 'expo-notifications';

import { ensureNotificationPermissions } from '@/features/notifications/permissions';
import type { Reward } from './hooks/useStore';

export async function scheduleRewardCooldownNotification(reward: Reward) {
  if (!reward.cooldown_minutes) return;
  const ok = await ensureNotificationPermissions();
  if (!ok) return;

  await Notifications.setNotificationChannelAsync('rewards', {
    name: 'Recompensas',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recompensa disponível',
      body: `${reward.name} saiu do cooldown.`,
      data: { route: '/(app)/(tabs)/store', rewardId: reward.id, type: 'reward-cooldown' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(new Date().getTime() + reward.cooldown_minutes * 60_000),
      channelId: 'rewards',
    },
  });
}
