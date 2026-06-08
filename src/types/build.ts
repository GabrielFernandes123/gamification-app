import type { AttributeKey } from '@/features/character/attributes';

/** Slot de equipamento (03 §4). */
export type EquipmentSlot = 'arma' | 'armadura' | 'acessorio';
export type EquipmentTier = 'mensal' | 'trimestral' | 'semestral' | 'anual';
export type EquipmentSource = 'loja' | 'boss_drop';

/** Bônus de atributo carregados por um item ({forca, foco, ...}). */
export type AttributeBonuses = Partial<Record<AttributeKey, number>>;

/** Item comprável (GET /store/equipment). */
export type EquipmentCatalogItem = {
  id: string;
  name: string;
  slot: EquipmentSlot;
  attribute_bonuses: AttributeBonuses;
  required_level: number;
  cost_gold: number | null;
  cost_essencia: number | null;
  tier_origem: EquipmentTier;
  sort_order: number;
};

/** Instância possuída (GET /build/equipment). */
export type OwnedEquipment = {
  id: string;
  catalog_id: string | null;
  name: string;
  slot: EquipmentSlot;
  attribute_bonuses: AttributeBonuses;
  required_level: number;
  source: EquipmentSource;
  is_equipped: boolean;
  created_at: string;
};

/** Breakdown de um atributo (GET /build/attributes). */
export type AttributeBreakdown = {
  key: AttributeKey;
  total: number;
  base: number;
  favored: boolean;
  classBonus: number;
  points: number;
  skills: { name: string; level: number }[];
  bodyParts: { name: string; level: number }[];
  equipment: { name: string; slot: EquipmentSlot; bonus: number }[];
};

export type AttributeTotals = {
  class: 'guerreiro' | 'mago' | 'ladino' | null;
  attributes: AttributeBreakdown[];
};
