import type { Database } from '@/types/db';

export type AttributeKey = Database['public']['Enums']['attribute_key'];

/** Os 4 atributos fixos do sistema (03 §1). Build vem na Fase 4. */
export const ATTRIBUTES: readonly {
  key: AttributeKey;
  label: string;
  hint: string;
}[] = [
  { key: 'forca', label: 'Força', hint: 'Dano ao boss' },
  { key: 'agilidade', label: 'Agilidade', hint: 'Crítico e esquiva' },
  { key: 'vitalidade', label: 'Vitalidade', hint: 'Defesa' },
  { key: 'foco', label: 'Foco', hint: 'Explora a fraqueza' },
];

export const ATTRIBUTE_LABEL: Record<AttributeKey, string> = {
  forca: 'Força',
  agilidade: 'Agilidade',
  vitalidade: 'Vitalidade',
  foco: 'Foco',
};
