import type { Database } from '@/types/db';
import type { AttributeKey } from './attributes';

export type CharacterClass = Database['public']['Enums']['character_class'];

/** Classe leve (03 §5): +15% no atributo favorito. Vitalidade não tem classe. */
export const CLASSES: readonly {
  key: CharacterClass;
  label: string;
  favorite: AttributeKey;
  hint: string;
}[] = [
  { key: 'guerreiro', label: 'Guerreiro', favorite: 'forca', hint: 'Treino e disciplina física' },
  { key: 'mago', label: 'Mago', favorite: 'foco', hint: 'Estudo e mente' },
  { key: 'ladino', label: 'Ladino', favorite: 'agilidade', hint: 'Constância e streaks' },
];

/** Custo do respec de classe em Essência (espelha a API; 1ª escolha é grátis). */
export const RESPEC_ESSENCIA_COST = 50;
