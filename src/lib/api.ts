import { env } from './env';
import { supabase } from './supabase';

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Não autenticado');
  }

  const url = `${env.API_URL}${path}`;
  console.log(`[api] ${options.method ?? 'GET'} ${url}`);

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  console.log(`[api] <- ${response.status} ${url}`);

  const payload = await readPayload(response);

  if (!response.ok) {
    console.log(`[api] erro ${response.status} em ${url}:`, getErrorMessage(payload, response.status));
    throw new Error(getErrorMessage(payload, response.status));
  }

  return payload as T;
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
