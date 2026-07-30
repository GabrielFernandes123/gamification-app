import { Platform } from 'react-native';

/**
 * A ÚNICA superfície do app que toca o HealthKit.
 *
 * Segue o princípio do doc 14 §6.6 (provider externo sempre atrás de uma
 * interface): o resto do app pede "as noites" e "a FC média deste intervalo" —
 * ninguém mais sabe que existe HealthKit, nem que o iOS existe. Mesmo desenho de
 * `features/tracking/ios/`, que isola o DeviceActivity.
 *
 * ── Por que o require é opcional ──────────────────────────────────────────
 * O módulo nativo (`@kingstinct/react-native-healthkit`, que usa Nitro) só
 * existe depois de um build novo do EAS e da capability habilitada no portal da
 * Apple — ver `docs/13-ios-build-e-apple.md` §6, onde já foi preciso ligar à mão
 * e apagar os provisioning profiles.
 *
 * Um `import` estático quebraria o bundle antes desse build. Com o require
 * guardado, o app continua funcionando: sem módulo nativo, `readSleepSessions`
 * devolve lista vazia e nada acontece. Quando o build chegar, começa a
 * funcionar sozinho — sem tocar em mais nenhum arquivo.
 */

export type SleepSession = {
  /** Id estável do HealthKit. É o que o backend usa para não pagar duas vezes. */
  externalId: string;
  startedAt: string;
  endedAt: string;
};

/** Amostra de categoria como o pacote devolve (campos que usamos). */
type CategorySample = {
  uuid: string;
  startDate: Date | string;
  endDate: Date | string;
  value: number;
};

type HealthKitModule = {
  isHealthDataAvailable: () => boolean;
  requestAuthorization: (toRequest: {
    toRead: readonly string[];
  }) => Promise<boolean>;
  queryCategorySamples: (
    identifier: string,
    options: { filter?: { date?: { startDate?: Date; endDate?: Date } } },
  ) => Promise<readonly CategorySample[]>;
  queryStatisticsForQuantity: (
    identifier: string,
    statistics: readonly string[],
    options?: { filter?: { date?: { startDate?: Date; endDate?: Date } } },
  ) => Promise<{ discreteAverage?: { quantity: number } } | null>;
};

const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis';
const HEART_RATE_TYPE = 'HKQuantityTypeIdentifierHeartRate';

/**
 * Valores de `HKCategoryValueSleepAnalysis` que contam como SONO de verdade.
 * `inBed` (0) fica de fora: deitar lendo por duas horas não é ter dormido, e
 * contar isso inflaria a duração exatamente no critério que o usuário escolheu
 * medir.
 */
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);

function nativeModule(): HealthKitModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@kingstinct/react-native-healthkit') as Partial<HealthKitModule> & {
      default?: Partial<HealthKitModule>;
    };
    const resolved = (mod.default ?? mod) as HealthKitModule;
    return typeof resolved?.queryCategorySamples === 'function' ? resolved : null;
  } catch {
    // Build sem o módulo nativo ainda. Não é erro: é o estado até o próximo EAS.
    return null;
  }
}

export function isHealthKitAvailable(): boolean {
  const health = nativeModule();
  if (!health) return false;
  try {
    return health.isHealthDataAvailable();
  } catch {
    return false;
  }
}

/** Pede leitura de sono e FC. Nada de escrita: este módulo só lê. */
export async function requestHealthPermissions(): Promise<boolean> {
  const health = nativeModule();
  if (!health) return false;
  try {
    return await health.requestAuthorization({
      toRead: [SLEEP_TYPE, HEART_RATE_TYPE],
    });
  } catch {
    return false;
  }
}

/**
 * Sessões de sono desde `since`.
 *
 * O relógio grava a noite em vários pedaços (acordou, virou, voltou a dormir), e
 * o HealthKit devolve cada pedaço como uma amostra. Fundimos os pedaços
 * próximos numa noite só — senão uma noite viraria oito sessões, e o backend,
 * que guarda uma noite por data, descartaria sete como duplicata.
 */
export async function readSleepSessions(since: Date): Promise<SleepSession[]> {
  const health = nativeModule();
  if (!health) return [];

  try {
    const samples = await health.queryCategorySamples(SLEEP_TYPE, {
      filter: { date: { startDate: since, endDate: new Date() } },
    });

    const asleep = samples
      .filter((sample) => ASLEEP_VALUES.has(Number(sample.value)))
      .map((sample) => ({
        uuid: sample.uuid,
        startedAt: toIso(sample.startDate),
        endedAt: toIso(sample.endDate),
      }))
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

    return mergeSessions(asleep);
  } catch {
    return [];
  }
}

/**
 * FC média num intervalo — consumida pelo Cardio para modular a dificuldade em
 * ±20% (doc 14 §4.5).
 *
 * `null` quando não há amostra: a regra combinada é que, sem FC, o cardio conta
 * só pela duração.
 */
export async function averageHeartRate(
  startISO: string,
  endISO: string,
): Promise<number | null> {
  const health = nativeModule();
  if (!health) return null;
  try {
    const stats = await health.queryStatisticsForQuantity(
      HEART_RATE_TYPE,
      ['discreteAverage'],
      { filter: { date: { startDate: new Date(startISO), endDate: new Date(endISO) } } },
    );
    const value = stats?.discreteAverage?.quantity;
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.round(value)
      : null;
  } catch {
    return null;
  }
}

/** Intervalo entre pedaços que ainda conta como a MESMA noite. */
const MERGE_GAP_MS = 60 * 60 * 1000;

type RawSession = { uuid: string; startedAt: string; endedAt: string };

function mergeSessions(samples: RawSession[]): SleepSession[] {
  const merged: SleepSession[] = [];

  for (const sample of samples) {
    const previous = merged[merged.length - 1];
    const gap = previous
      ? Date.parse(sample.startedAt) - Date.parse(previous.endedAt)
      : Infinity;

    if (previous && gap <= MERGE_GAP_MS) {
      // Mantém o externalId do PRIMEIRO pedaço: é o que dá estabilidade ao
      // dedupe. Reimportar a mesma noite tem de produzir o mesmo id, e o
      // primeiro pedaço é o único que não muda quando o relógio acrescenta
      // amostras no fim da noite.
      previous.endedAt = maxIso(previous.endedAt, sample.endedAt);
      continue;
    }

    merged.push({
      externalId: sample.uuid,
      startedAt: sample.startedAt,
      endedAt: sample.endedAt,
    });
  }

  return merged;
}

/** O pacote devolve `Date`; a API fala ISO. Aceita os dois por segurança. */
function toIso(value: Date | string): string {
  return typeof value === 'string' ? value : value.toISOString();
}

function maxIso(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}
