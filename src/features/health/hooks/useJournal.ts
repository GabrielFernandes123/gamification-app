import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';

/** Espelha `gamificacao-api/src/journal/journal.service.ts`. */
export type JournalEntry = {
  id: string;
  occurredOn: string;
  mood: number | null;
  /** O que VOCÊ escreveu. A IA nunca sobrescreve. */
  text: string | null;
  /** Caminho no bucket privado — não abre sozinho. */
  photoPath: string | null;
  audioPath: string | null;
  /** URL assinada, gerada a cada leitura e com validade curta. */
  photoUrl: string | null;
  audioUrl: string | null;
  /** O que a IA leu/ouviu. Coluna separada, editável, descartável. */
  transcription: string | null;
  transcriptionModel: string | null;
};

export function useJournal(start: string, end: string) {
  return useQuery({
    queryKey: qk.journal(start, end),
    queryFn: () =>
      apiFetch<JournalEntry[]>(
        `/journal?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
  });
}

export function useSaveJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      occurredOn?: string;
      mood?: number | null;
      text?: string | null;
      photoPath?: string | null;
      audioPath?: string | null;
    }) =>
      apiFetch<{ id: string; occurredOn: string; created: boolean }>('/journal', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['journal'] });
      // O primeiro registro do dia paga XP trivial — o HUD precisa saber.
      void qc.invalidateQueries({ queryKey: qk.character });
    },
  });
}

/** Transcrição é SEMPRE a pedido: mandar o diário para a IA é escolha sua. */
export function useTranscribeJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ transcription: string; model: string }>(
        `/journal/${id}/transcribe`,
        { method: 'POST' },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  });
}

/** Descarta a leitura da IA sem levar junto a foto/áudio do dia. */
export function useClearTranscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ cleared: string }>(`/journal/${id}/transcription`, {
        method: 'DELETE',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  });
}

/**
 * Sobe mídia para o bucket PRIVADO `journal-media`.
 *
 * O caminho vem da API (a primeira pasta é o `userId`, que é o que a política de
 * RLS confere) e o upload vai direto do aparelho para o Storage com a sessão do
 * usuário — os bytes não passam pela nossa API.
 *
 * Devolve o CAMINHO, não uma URL: o bucket é privado, e a URL de leitura é
 * assinada na hora da consulta.
 */
export async function uploadJournalMedia(
  kind: 'photo' | 'audio',
  source: { uri: string; base64?: string | null },
  extension: string,
  contentType: string,
): Promise<string> {
  const target = await apiFetch<{ bucket: string; path: string }>(
    '/journal/upload-target',
    { method: 'POST', body: { kind, extension } },
  );

  // A foto vem do picker com `base64` — é o caminho que o `ImageUploadPicker`
  // já usa e que sabemos que funciona. A gravação de áudio só entrega um
  // `file://`, e aí não há alternativa senão ler pelo fetch.
  const bytes = source.base64
    ? base64ToArrayBuffer(source.base64)
    : await (await fetch(source.uri)).arrayBuffer();

  const { error } = await supabase.storage
    .from(target.bucket)
    .upload(target.path, bytes, { contentType, upsert: false });
  if (error) throw error;

  return target.path;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
