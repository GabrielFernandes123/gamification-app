// Variáveis EXPO_PUBLIC_* são embutidas no bundle pelo Expo em build time.
// A anon key é publishable (segura no client) — o RLS é quem protege os dados.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !API_URL) {
  throw new Error(
    'Faltam EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY / EXPO_PUBLIC_API_URL. Configure o arquivo .env.',
  );
}

export const env = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  API_URL,
} as const;
