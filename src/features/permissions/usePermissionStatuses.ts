import { useQuery } from '@tanstack/react-query';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as DeviceActivity from 'react-native-device-activity';

import { isHealthKitAvailable, requestHealthPermissions } from '@/features/health/ios/healthkit';
import { ensureNotificationPermissions } from '@/features/notifications/permissions';

/**
 * O estado das permissões do aparelho, num lugar só.
 *
 * Depois do enxugamento (doc 08 §0), **permissão é a única configuração que
 * sobra no celular** — o resto foi para o web. E ela não podia ficar só no
 * fluxo de uso: cada permissão era pedida no momento em que a ação acontecia
 * (`diario.tsx`, `MealVoiceButton`, `useHealthSync`, `ShieldStatusCard`), e o
 * iOS **só pergunta uma vez**. Quem negasse por engano ficava sem caminho
 * nenhum na interface para voltar atrás — a ação simplesmente não funcionava
 * mais, sem dizer por quê.
 *
 * Este hook só LÊ. Pedir continua sendo responsabilidade de quem usa
 * (`ensureNotificationPermissions`, `requestRecordingPermissionsAsync`, …); o
 * que a tela acrescenta é o estado visível e o caminho para os Ajustes.
 */

export type PermissionKey =
  | 'notifications'
  | 'health'
  | 'microphone'
  | 'camera'
  | 'photos'
  | 'screentime';

/**
 * `unknown` não é preguiça: o HealthKit **não expõe** o status de leitura por
 * decisão de privacidade da Apple (saber que o app não pode ler já vazaria que
 * o dado existe). Fingir "concedido" seria mentira; então o estado se assume
 * desconhecido e a tela diz isso.
 */
export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable' | 'unknown';

export type PermissionStatus = {
  key: PermissionKey;
  /** Rótulo do iOS, para o usuário achar a mesma palavra dentro dos Ajustes. */
  label: string;
  /** O que deixa de funcionar sem ela — em ação, não em abstrato. */
  detail: string;
  state: PermissionState;
};

const LABELS: Record<PermissionKey, { label: string; detail: string }> = {
  notifications: {
    label: 'Notificações',
    detail: 'Lembretes dos hábitos e aviso quando o tempo de tela começa a cobrar.',
  },
  health: {
    label: 'Saúde',
    detail: 'Importa as noites de sono do relógio sem você registrar nada.',
  },
  microphone: {
    label: 'Microfone',
    detail: 'Registrar refeição por voz e gravar áudio no diário.',
  },
  camera: {
    label: 'Câmera',
    detail: 'Fotografar o caderno direto no diário.',
  },
  photos: {
    label: 'Fotos',
    detail: 'Anexar imagem da galeria no diário e nos registros.',
  },
  screentime: {
    label: 'Tempo de Uso',
    detail: 'Medir e bloquear os apps deste iPhone. Gerenciado no painel abaixo.',
  },
};

export function usePermissionStatuses() {
  const query = useQuery({
    queryKey: ['permissionStatuses'],
    queryFn: readAll,
    // Estado do SO, não do servidor: nunca é "fresco" por tempo, e sim por
    // evento (voltar dos Ajustes, conceder na tela). Daí staleTime 0.
    staleTime: 0,
    gcTime: 0,
  });

  const { refetch } = query;

  /**
   * Reler ao voltar do primeiro plano é o que faz a tela valer: o usuário sai
   * daqui para os Ajustes, vira a chave e volta. Sem isto, ele voltaria para o
   * mesmo "Negado" e concluiria que não funcionou.
   */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  return { statuses: query.data ?? null, refresh: refetch };
}

async function readAll(): Promise<PermissionStatus[]> {
  const [notifications, microphone, camera, photos] = await Promise.all([
    read(() => Notifications.getPermissionsAsync()),
    read(() => getRecordingPermissionsAsync()),
    read(() => ImagePicker.getCameraPermissionsAsync()),
    read(() => ImagePicker.getMediaLibraryPermissionsAsync()),
  ]);

  return [
    build('notifications', notifications),
    build('health', healthState()),
    build('microphone', microphone),
    build('camera', camera),
    build('photos', photos),
    build('screentime', screenTimeState()),
  ];
}

function build(key: PermissionKey, state: PermissionState): PermissionStatus {
  return { key, ...LABELS[key], state };
}

/** Envelopa os getters do Expo, que compartilham o mesmo formato de resposta. */
async function read(
  getter: () => Promise<{ status: string; canAskAgain?: boolean }>,
): Promise<PermissionState> {
  try {
    const { status } = await getter();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
}

function healthState(): PermissionState {
  if (Platform.OS !== 'ios') return 'unavailable';
  return isHealthKitAvailable() ? 'unknown' : 'unavailable';
}

/** 0 = não perguntado · 1 = negado · 2 = concedido (mesma leitura do ShieldStatusCard). */
function screenTimeState(): PermissionState {
  if (Platform.OS !== 'ios') return 'unavailable';
  try {
    if (!DeviceActivity.isAvailable()) return 'unavailable';
    const status = DeviceActivity.getAuthorizationStatus();
    if (status === 2) return 'granted';
    if (status === 1) return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
}

/**
 * O pedido de cada permissão, reusando quem já era dono dele. Só faz sentido
 * quando o estado é `undetermined`: depois de negada, o iOS não pergunta de
 * novo e o único caminho são os Ajustes.
 *
 * `screentime` fica de fora de propósito — quem pede é o `ShieldStatusCard`,
 * logo abaixo na mesma tela, e dois botões para a mesma autorização é o tipo de
 * porta duplicada que o doc 08 §6.3 manda remover.
 */
export const REQUESTERS: Partial<Record<PermissionKey, () => Promise<unknown>>> = {
  notifications: ensureNotificationPermissions,
  health: requestHealthPermissions,
  microphone: requestRecordingPermissionsAsync,
  camera: ImagePicker.requestCameraPermissionsAsync,
  photos: ImagePicker.requestMediaLibraryPermissionsAsync,
};
