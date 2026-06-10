import * as Notifications from 'expo-notifications';

export type SchedulableHabit = {
  id: string;
  name: string;
  type: 'positive' | 'negative';
  is_active: boolean;
  schedule: 'weekdays' | 'weekly_count' | 'monthly';
  weekdays: number[] | null;
  reminder_times: string[] | null;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function parseTime(t: string): { hour: number; minute: number } | null {
  const [h, m] = t.split(':').map((x) => Number(x));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { hour: h, minute: m };
}

function content(habit: SchedulableHabit): Notifications.NotificationContentInput {
  const title = habit.type === 'positive' ? `Hora de: ${habit.name}` : `Segura firme: ${habit.name}`;
  const body = habit.type === 'positive' ? 'Registre e ganhe XP.' : 'Evite a recaida e mantenha o streak.';
  return { title, body, data: { habitId: habit.id } };
}

async function scheduleForHabit(habit: SchedulableHabit) {
  if (!habit.is_active) return;
  for (const t of habit.reminder_times ?? []) {
    const time = parseTime(t);
    if (!time) continue;
    const c = content(habit);

    if (habit.schedule === 'weekdays') {
      for (const d of habit.weekdays ?? []) {
        await Notifications.scheduleNotificationAsync({
          content: c,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: d + 1,
            hour: time.hour,
            minute: time.minute,
            channelId: 'habits',
          },
        });
      }
    } else {
      await Notifications.scheduleNotificationAsync({
        content: c,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
          channelId: 'habits',
        },
      });
    }
  }
}

async function scheduleBodyAlerts(alerts: string[]) {
  if (alerts.length === 0) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Corpo',
      body: alerts.slice(0, 2).join(' '),
      data: { route: '/(app)/(tabs)/body', type: 'body-alert' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
      channelId: 'body',
    },
  });
}

export async function syncAppNotifications(habits: SchedulableHabit[], bodyAlerts: string[] = []) {
  try {
    await Notifications.setNotificationChannelAsync('habits', {
      name: 'Habitos',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('body', {
      name: 'Corpo',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const h of habits) await scheduleForHabit(h);
    await scheduleBodyAlerts(bodyAlerts);
  } catch {
    // Notificacoes sao best-effort.
  }
}

export const syncHabitNotifications = syncAppNotifications;
