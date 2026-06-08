export function formatErrorMessage(error: unknown): string {
  const raw = readErrorMessage(error);
  const message = raw.trim();

  if (!message) return 'Tente novamente.';
  if (/jwt|auth|não autenticado|not authenticated/i.test(message)) return 'Sessão expirada. Entre novamente.';
  if (/duplicate key|unique constraint/i.test(message)) return 'Já existe um registro com esses dados.';
  if (/network|fetch|failed to fetch/i.test(message)) return 'Falha de conexão. Verifique a internet.';
  if (/violates row-level security|permission denied/i.test(message)) return 'Você não tem permissão para esta ação.';

  return message.replace(/^Error:\s*/i, '');
}

function readErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return readErrorMessage(error.message);
  if (typeof error !== 'object') return String(error);

  const record = error as Record<string, unknown>;
  const parts = [
    record.message,
    record.error_description,
    record.details,
    record.hint,
    record.code,
  ]
    .map((value) => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object') return readErrorMessage(value);
      return '';
    })
    .filter(Boolean);

  if (parts.length > 0) return parts.join(' ');

  try {
    return JSON.stringify(error);
  } catch {
    return 'Tente novamente.';
  }
}
