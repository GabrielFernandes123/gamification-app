import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiFetch } from '@/lib/api';
import { ensureNotificationPermissions } from './permissions';

/**
 * Registra o token de push do aparelho na API — é assim que o celular recebe
 * os alertas do que acontece no PC ("o YouTube começou a cobrar", "você está
 * queimando ouro"). Best-effort: qualquer falha é silenciosa, o app não depende
 * disso para funcionar.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null; // emulador não recebe push
    if (!(await ensureNotificationPermissions())) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('tracking', {
        name: 'Tempo de tela',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    if (!projectId) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;

    await apiFetch('/tracking/push-token', {
      method: 'POST',
      body: { token, platform: Platform.OS },
    });
    return token;
  } catch {
    return null;
  }
}
