import { env } from './env';
import { supabase } from './supabase';

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

let cachedAccessToken: string | null = null;
let cachedExpiresAt = 0;

/** Limpa o token em cache (chamar no logout/troca de usuário). */
export function clearCachedToken() {
  cachedAccessToken = null;
  cachedExpiresAt = 0;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const url = `${env.API_URL}${path}`;
  const startedAt = Date.now();

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (__DEV__) {
    const elapsed = Date.now() - startedAt;
    if (elapsed > 500) {
      console.log(`[api] slow ${options.method ?? 'GET'} ${path} ${response.status} ${elapsed}ms`);
    }
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      cachedExpiresAt = 0;
    }
    if (__DEV__) {
      console.log(`[api] erro ${response.status} em ${path}:`, getErrorMessage(payload, response.status));
    }
    throw new Error(getErrorMessage(payload, response.status));
  }

  return payload as T;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedExpiresAt - now > 60) {
    return cachedAccessToken;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Não autenticado');
  }

  cachedAccessToken = session.access_token;
  cachedExpiresAt = session.expires_at ?? now + 300;
  return cachedAccessToken;
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    return Array.isArray(message) ? message.join(', ') : String(message);
  }

  if (typeof payload === 'string' && payload.length > 0) {
    return payload;
  }

  return `Erro HTTP ${status}`;
}
