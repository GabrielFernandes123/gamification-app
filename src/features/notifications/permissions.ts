import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Pede permissão de notificação (só em device físico). Chamada de forma lazy
// — apenas quando há lembretes a agendar.
export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    status = req.status;
  }
  return status === 'granted';
}
