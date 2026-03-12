export interface PatientRaw {
  name: string;
  age: number;
  g: 'M' | 'F';
  sr: 'H' | 'M' | 'L' | 'U';
  ar: number;
  gr: number;
  htn: number;
  dm: number;
  oa: number;
  osteo: number;
  injury: number;
  surgical: number;
  thyroid: number;
  flex: number;
  ext: number;
  lrot: number;
  rrot: number;
  start: number;
  fab_l: number;
  fair_l: number;
  slr_l: number;
  fab_r: number;
  fair_r: number;
  slr_r: number;
  hyp: number;
  tend: number;
  tight: number;
  knots: number;
  site: string;
}

export interface PatientResult extends PatientRaw {
  rpi: number;
  tier: 'Red' | 'Amber' | 'Green';
}

export interface GroupWeights {
  start: number;
  rom: number;
  physio: number;
  anthro: number;
  comor: number;
  life: number;
}

export interface SubWeightsStart {
  s1: number; s2: number; s3: number; s4: number; s5: number;
  s6: number; s7: number; s8: number; s9: number;
}

export interface SubWeightsROM {
  flex: number; ext: number; lrot: number; rrot: number;
}

export interface SubWeightsPhysio {
  fabl: number; fairl: number; slrl: number;
  fabr: number; fairr: number; slrr: number;
  hyp: number; tend: number; tight: number; knots: number;
}

export interface SubWeightsAnthro {
  age: number; gen: number;
}

export interface SubWeightsComor {
  htn: number; dm: number; oa: number; osteo: number;
  inj: number; surg: number; thyr: number;
}

export interface SubWeightsLife {
  lifeinj: number; lifesurg: number;
  smoke: number; alcohol: number; sitting: number; standing: number;
}

export interface AllSubWeights {
  start: SubWeightsStart;
  rom: SubWeightsROM;
  physio: SubWeightsPhysio;
  anthro: SubWeightsAnthro;
  comor: SubWeightsComor;
  life: SubWeightsLife;
}

export interface LifeOverride {
  smoke: number;
  smokeyrs: string;
  alcohol: number;
  alcoholyrs: string;
  sitting: number;
  standing: number;
}

export interface PatientSnapshot {
  name: string;
  rpi: number;
  tier: 'Red' | 'Amber' | 'Green';
  manualRisk: 'H' | 'M' | 'L' | 'U';
  domainScores: {
    start: number;
    rom: number;
    physio: number;
    anthro: number;
    comor: number;
    life: number;
  };
}

export interface SavedScenario {
  id: number;
  ts: string;
  W: GroupWeights;
  SW: AllSubWeights;
  TGA: number;
  TAR: number;
  green: number;
  amber: number;
  red: number;
  total: number;
  sens: number;
  prec: number;
  acc: number;
  patients: PatientSnapshot[];
}

export type SortColumn = 'name' | 'age' | 'sr' | 'rpi';
export type SortDirection = 1 | -1;
