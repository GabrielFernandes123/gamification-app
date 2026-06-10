import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import { ensureNotificationPermissions } from './permissions';
import { syncAppNotifications, type SchedulableHabit } from './scheduler';

type NotificationSnapshot = {
  habits: SchedulableHabit[];
  bodyAlerts: string[];
};

export function useNotificationSync() {
  const snapshot = useQuery({
    queryKey: qk.notificationSnapshot,
    queryFn: () => apiFetch<NotificationSnapshot>('/notifications/snapshot'),
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
  });

  useEffect(() => {
    const data = snapshot.data;
    if (!data) return;

    const hasReminders = data.habits.some(
      (h) => h.is_active && (h.reminder_times?.length ?? 0) > 0,
    );

    (async () => {
      if (hasReminders || data.bodyAlerts.length > 0) {
        const ok = await ensureNotificationPermissions();
        if (!ok) return;
      }
      await syncAppNotifications(data.habits, data.bodyAlerts);
    })();
  }, [snapshot.data]);
}
