import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiFetch } from '@/lib/api';

const STORAGE_KEY = 'tracking.deviceToken';
const DEVICE_NAME = 'iPhone (app)';

type SelfDeviceResponse = {
  device_id: string;
  device_token: string;
  name: string;
  platform: string;
};

let cached: string | null = null;

/**
 * Token de dispositivo (`dvc_`) do próprio app.
 *
 * As extensions nativas (shield) não conseguem renovar um JWT do Supabase: elas
 * rodam por segundos, sem sessão. Então o app troca sua sessão por um token
 * opaco de longa duração uma única vez e passa a usá-lo para `/tracking/policy`
 * e `/tracking/unlock` — inclusive embutido nos headers das ações do shield,
 * que ficam gravadas no App Group.
 *
 * `POST /tracking/devices/self` ROTACIONA o token a cada chamada (o valor em
 * claro só existe naquela resposta), por isso guardamos e só pedimos de novo se
 * não houver nada salvo.
 */
export async function getDeviceToken(): Promise<string> {
  if (cached) return cached;

  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    cached = stored;
    return stored;
  }

  const created = await apiFetch<SelfDeviceResponse>('/tracking/devices/self', {
    method: 'POST',
    body: { name: DEVICE_NAME, platform: 'iphone' },
  });
  await AsyncStorage.setItem(STORAGE_KEY, created.device_token);
  cached = created.device_token;
  return created.device_token;
}

/** Descarta o token local (token revogado no servidor, logout, troca de conta). */
export async function clearDeviceToken(): Promise<void> {
  cached = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
}
