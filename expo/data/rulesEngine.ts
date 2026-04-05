import {
  GroupWeights,
  AllSubWeights,
  PatientRaw,
  PatientResult,
} from './types';
import {
  getResults,
  computeStats,
  getMatchType,
  sSTarT,
  sROM,
  sPhysio,
  sAnthropo,
  sComor,
  sLife,
} from './scoring';

export type RuleConfig = {
  weights: GroupWeights;
  subWeights: AllSubWeights;
  tga: number;
  tar: number;
  score: number;
  sensitivity: number;
  precision: number;
  accuracy: number;
};

type ExplainResult = {
  strongestDomain: string;
  topSubWeights: string[];
  summary: string;
};

const GROUP_KEYS: Array<keyof GroupWeights> = ['start', 'rom', 'physio', 'anthro', 'comor', 'life'];
const SUB_WEIGHT_DOMAINS: Array<keyof AllSubWeights> = ['start', 'rom', 'physio', 'anthro', 'comor', 'life'];

const SUB_WEIGHT_KEYS: Record<keyof AllSubWeights, string[]> = {
  start: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'],
  rom: ['flex', 'ext', 'lrot', 'rrot'],
  physio: ['fabl', 'fairl', 'slrl', 'fabr', 'fairr', 'slrr', 'hyp', 'tend', 'tight', 'knots'],
  anthro: ['age', 'gen'],
  comor: ['htn', 'dm', 'oa', 'osteo', 'inj', 'surg', 'thyr'],
  life: ['lifeinj', 'lifesurg', 'smoke', 'alcohol', 'sitting', 'standing'],
};

function clamp(value: number, min = 1): number {
  return Math.max(min, Math.round(value));
}

function normalizeWeights(weights: GroupWeights): GroupWeights {
  return {
    start: clamp(weights.start),
    rom: clamp(weights.rom),
    physio: clamp(weights.physio),
    anthro: clamp(weights.anthro),
    comor: clamp(weights.comor),
    life: clamp(weights.life),
  };
}

type DomainWeightMap = Record<string, number>;

function getDomainWeights(domain: keyof AllSubWeights, subWeights: AllSubWeights): DomainWeightMap {
  return subWeights[domain] as unknown as DomainWeightMap;
}

function normalizeSubWeights(subWeights: AllSubWeights): AllSubWeights {
  const normalized: Partial<AllSubWeights> = {};

  for (const domain of SUB_WEIGHT_DOMAINS) {
    const domainWeights = getDomainWeights(domain, subWeights);
    const normalizedDomain: Record<string, number> = {};
    const keys = SUB_WEIGHT_KEYS[domain];
    let sum = 0;

    for (const key of keys) {
      const value = clamp(domainWeights[key] as number, 1);
      normalizedDomain[key] = value;
      sum += value;
    }

    if (sum === 0) {
      const fallback = Math.max(1, Math.round(100 / keys.length));
      for (const key of keys) {
        normalizedDomain[key] = fallback;
      }
    }

    normalized[domain] = normalizedDomain as never;
  }

  return normalized as AllSubWeights;
}

function cloneSubWeights(subWeights: AllSubWeights): AllSubWeights {
  return {
    start: { ...subWeights.start },
    rom: { ...subWeights.rom },
    physio: { ...subWeights.physio },
    anthro: { ...subWeights.anthro },
    comor: { ...subWeights.comor },
    life: { ...subWeights.life },
  };
}

function evaluateConfig(
  patients: PatientRaw[],
  config: Omit<RuleConfig, 'score' | 'sensitivity' | 'precision' | 'accuracy'>,
): RuleConfig {
  const results = getResults(patients, config.weights, config.subWeights, config.tga, config.tar, {});
  const stats = computeStats(results);
  const matchCounts = results.reduce(
    (counts, patient) => {
      const type = getMatchType(patient.sr, patient.tier);
      if (type === 'Concordant') counts.concordant += 1;
      if (type === 'Partial') counts.partial += 1;
      if (type === 'Discordant') counts.discordant += 1;
      return counts;
    },
    { concordant: 0, partial: 0, discordant: 0 },
  );

  const controlFactor = Math.max(0, matchCounts.concordant - matchCounts.discordant) / Math.max(1, results.length);
  const score = stats.acc + Math.round(controlFactor * 10);

  return {
    ...config,
    score,
    sensitivity: stats.sens,
    precision: stats.prec,
    accuracy: stats.acc,
  };
}

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function mutateGroupWeights(weights: GroupWeights): GroupWeights {
  const result = { ...weights };
  const key = randomChoice(GROUP_KEYS);
  const delta = Math.random() < 0.5 ? -5 : 5;
  result[key] = clamp(result[key] + delta);

  const otherKeys = GROUP_KEYS.filter((k) => k !== key);
  const secondary = randomChoice(otherKeys);
  result[secondary] = clamp(result[secondary] - delta);

  return normalizeWeights(result);
}

function mutateSubWeights(subWeights: AllSubWeights): AllSubWeights {
  const result = cloneSubWeights(subWeights);
  const domain = randomChoice(SUB_WEIGHT_DOMAINS);
  const domainKeys = SUB_WEIGHT_KEYS[domain];
  const key = randomChoice(domainKeys) as keyof typeof result[typeof domain];
  const delta = Math.random() < 0.5 ? -5 : 5;

  const domainWeights = getDomainWeights(domain, result);
  domainWeights[key as string] = clamp((domainWeights[key as string] || 1) + delta);

  const otherKeys = domainKeys.filter((k) => k !== key);
  if (otherKeys.length > 0) {
    const secondary = randomChoice(otherKeys);
    domainWeights[secondary] = clamp((domainWeights[secondary] || 1) - delta);
  }

  return normalizeSubWeights(result);
}

function mutateThresholds(tga: number, tar: number): { tga: number; tar: number } {
  const newTga = clamp(tga + (Math.random() < 0.5 ? -3 : 3), 0);
  const newTar = clamp(tar + (Math.random() < 0.5 ? -3 : 3), 0);
  if (newTar <= newTga) {
    return { tga: Math.max(0, newTga), tar: Math.max(newTga + 1, newTar + 5) };
  }
  return { tga: newTga, tar: newTar };
}

function buildBaseConfig(): Omit<RuleConfig, 'score' | 'sensitivity' | 'precision' | 'accuracy'> {
  return {
    weights: {
      start: 35,
      rom: 25,
      physio: 15,
      anthro: 12,
      comor: 8,
      life: 5,
    },
    subWeights: {
      start: { s1: 11, s2: 11, s3: 11, s4: 12, s5: 12, s6: 12, s7: 10, s8: 10, s9: 11 },
      rom: { flex: 25, ext: 25, lrot: 25, rrot: 25 },
      physio: { fabl: 10, fairl: 10, slrl: 10, fabr: 10, fairr: 10, slrr: 10, hyp: 10, tend: 10, tight: 10, knots: 10 },
      anthro: { age: 70, gen: 30 },
      comor: { htn: 16, dm: 16, oa: 16, osteo: 16, inj: 14, surg: 14, thyr: 8 },
      life: { lifeinj: 40, lifesurg: 30, smoke: 12, alcohol: 10, sitting: 4, standing: 4 },
    },
    tga: 35,
    tar: 55,
  };
}

export function optimiseWeights(patients: PatientRaw[], iterations: number): RuleConfig[] {
  const classifiedPatients = patients.filter((p) => p.sr !== 'U');
  if (classifiedPatients.length === 0) {
    return [];
  }

  const uniqueConfigs = new Map<string, RuleConfig>();

  const baseline = evaluateConfig(classifiedPatients, buildBaseConfig());
  uniqueConfigs.set(JSON.stringify({ weights: baseline.weights, subWeights: baseline.subWeights, tga: baseline.tga, tar: baseline.tar }), baseline);

  let current: RuleConfig = baseline;

  for (let i = 0; i < iterations; i += 1) {
    const nextCandidateBase = Math.random() < 0.4
      ? { ...current, weights: mutateGroupWeights(current.weights), subWeights: current.subWeights }
      : { ...current, weights: current.weights, subWeights: mutateSubWeights(current.subWeights) };

    const thresholds = mutateThresholds(nextCandidateBase.tga, nextCandidateBase.tar);
    const candidateBase = {
      weights: nextCandidateBase.weights,
      subWeights: nextCandidateBase.subWeights,
      tga: thresholds.tga,
      tar: thresholds.tar,
    };

    const candidate = evaluateConfig(classifiedPatients, candidateBase);
    const key = JSON.stringify({ weights: candidate.weights, subWeights: candidate.subWeights, tga: candidate.tga, tar: candidate.tar });

    if (!uniqueConfigs.has(key)) {
      uniqueConfigs.set(key, candidate);
    }

    if (candidate.accuracy > current.accuracy ||
      (candidate.accuracy === current.accuracy && candidate.precision > current.precision) ||
      (candidate.accuracy === current.accuracy && candidate.precision === current.precision && candidate.score > current.score)
    ) {
      current = candidate;
    }
  }

  return Array.from(uniqueConfigs.values())
    .sort((a, b) => {
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (b.precision !== a.precision) return b.precision - a.precision;
      return b.score - a.score;
    })
    .slice(0, 5);
}

function domainScoreDifference(
  config: RuleConfig,
  patients: PatientRaw[],
): Record<string, number> {
  const groups: Record<string, { total: number; count: number }> = {
    start: { total: 0, count: 0 },
    rom: { total: 0, count: 0 },
    physio: { total: 0, count: 0 },
    anthro: { total: 0, count: 0 },
    comor: { total: 0, count: 0 },
    life: { total: 0, count: 0 },
  };

  const high = { ...groups };
  const low = { ...groups };

  for (const patient of patients) {
    if (patient.sr !== 'H' && patient.sr !== 'L') continue;
    const values = {
      start: sSTarT(patient),
      rom: sROM(patient, config.subWeights),
      physio: sPhysio(patient, config.subWeights),
      anthro: sAnthropo(patient, config.subWeights),
      comor: sComor(patient, config.subWeights),
      life: sLife(patient, config.subWeights),
    };

    const target = patient.sr === 'H' ? high : low;
    for (const domain of GROUP_KEYS) {
      target[domain].total += values[domain];
      target[domain].count += 1;
    }
  }

  const differences: Record<string, number> = {};
  for (const domain of GROUP_KEYS) {
    const highAvg = high[domain].count ? high[domain].total / high[domain].count : 0;
    const lowAvg = low[domain].count ? low[domain].total / low[domain].count : 0;
    differences[domain] = Math.abs(highAvg - lowAvg);
  }

  return differences;
}

function perturbSubWeight(
  config: RuleConfig,
  domain: keyof AllSubWeights,
  key: string,
  change: number,
): RuleConfig {
  const subWeights = cloneSubWeights(config.subWeights);
  const domainWeights = getDomainWeights(domain, subWeights);
  domainWeights[key] = clamp((domainWeights[key] || 1) + change);

  const otherKeys = SUB_WEIGHT_KEYS[domain].filter((k) => k !== key);
  if (otherKeys.length > 0) {
    const secondary = otherKeys[0];
    domainWeights[secondary] = clamp((domainWeights[secondary] || 1) - change);
  }

  return {
    ...config,
    subWeights: normalizeSubWeights(subWeights),
  };
}

export function explainRule(config: RuleConfig, patients: PatientRaw[]): ExplainResult {
  const classifiedPatients = patients.filter((p) => p.sr !== 'U');
  const domainDiffs = domainScoreDifference(config, classifiedPatients);
  const strongestDomain = Object.entries(domainDiffs)
    .sort(([, a], [, b]) => b - a)
    .map(([domain]) => domain)[0] || 'start';

  const baselineResults = getResults(classifiedPatients, config.weights, config.subWeights, config.tga, config.tar, {});
  const baselineAccuracy = computeStats(baselineResults).acc;

  const impacts: Array<{ label: string; delta: number }> = [];

  for (const domain of SUB_WEIGHT_DOMAINS) {
    for (const key of SUB_WEIGHT_KEYS[domain]) {
      const perturbed = perturbSubWeight(config, domain, key, 5);
      const perturbedResults = getResults(classifiedPatients, perturbed.weights, perturbed.subWeights, perturbed.tga, perturbed.tar, {});
      const perturbedAccuracy = computeStats(perturbedResults).acc;
      impacts.push({ label: `${domain}.${key}`, delta: Math.abs(perturbedAccuracy - baselineAccuracy) });
    }
  }

  const topSubWeights = impacts
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
    .map((item) => item.label);

  const summary = `This rule uses ${strongestDomain} as the strongest predictor for high vs low risk patients. The sub-weights with the largest impact on accuracy are ${topSubWeights.join(', ')}. Under this configuration, the model achieves ${baselineAccuracy}% accuracy with ${config.sensitivity}% sensitivity and ${config.precision}% precision.`;

  return { strongestDomain, topSubWeights, summary };
}

export function compareConfigs(
  a: RuleConfig,
  b: RuleConfig,
  patients: PatientRaw[],
): Record<'KIMS' | 'Kues' | 'Abhis' | 'SDD', 'A' | 'B' | 'Tie'> {
  const sites: Array<'KIMS' | 'Kues' | 'Abhis' | 'SDD'> = ['KIMS', 'Kues', 'Abhis', 'SDD'];
  const result: Record<'KIMS' | 'Kues' | 'Abhis' | 'SDD', 'A' | 'B' | 'Tie'> = {
    KIMS: 'Tie',
    Kues: 'Tie',
    Abhis: 'Tie',
    SDD: 'Tie',
  };

  for (const site of sites) {
    const sitePatients = patients.filter((p) => p.site === site && p.sr !== 'U');
    if (sitePatients.length === 0) {
      result[site] = 'Tie';
      continue;
    }

    const aStats = computeStats(getResults(sitePatients, a.weights, a.subWeights, a.tga, a.tar, {}));
    const bStats = computeStats(getResults(sitePatients, b.weights, b.subWeights, b.tga, b.tar, {}));

    if (aStats.acc > bStats.acc) {
      result[site] = 'A';
    } else if (bStats.acc > aStats.acc) {
      result[site] = 'B';
    } else if (aStats.prec > bStats.prec) {
      result[site] = 'A';
    } else if (bStats.prec > aStats.prec) {
      result[site] = 'B';
    } else {
      result[site] = 'Tie';
    }
  }

  return result;
}
