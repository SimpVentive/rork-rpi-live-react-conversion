import { PatientRaw, PatientResult, GroupWeights, AllSubWeights, LifeOverride } from './types';

export const DEFAULT_WEIGHTS: GroupWeights = {
  start: 35, rom: 25, physio: 15, anthro: 12, comor: 8, life: 5,
};

export const DEFAULT_SUB_WEIGHTS: AllSubWeights = {
  start: { s1: 11, s2: 11, s3: 11, s4: 12, s5: 12, s6: 12, s7: 10, s8: 10, s9: 11 },
  rom: { flex: 25, ext: 25, lrot: 25, rrot: 25 },
  physio: { fabl: 10, fairl: 10, slrl: 10, fabr: 10, fairr: 10, slrr: 10, hyp: 10, tend: 10, tight: 10, knots: 10 },
  anthro: { age: 70, gen: 30 },
  comor: { htn: 16, dm: 16, oa: 16, osteo: 16, inj: 14, surg: 14, thyr: 8 },
  life: { lifeinj: 40, lifesurg: 30, smoke: 12, alcohol: 10, sitting: 4, standing: 4 },
};

export function sAge(age: number): number {
  if (age < 30) return 0;
  if (age < 40) return 1;
  if (age < 50) return 2;
  if (age < 60) return 3;
  if (age < 70) return 4;
  return 5;
}

export function sAnthropo(p: PatientRaw, sw: AllSubWeights): number {
  const ageW = sw.anthro.age / 100;
  const genW = sw.anthro.gen / 100;
  const tot = ageW + genW;
  if (tot === 0) return 0;
  return Math.min(100, Math.round(((ageW * (sAge(p.age) / 5)) + (genW * (p.gr * 2 / 2))) / tot * 100));
}

export function sComor(p: PatientRaw, sw: AllSubWeights): number {
  const s = sw.comor;
  const tot = s.htn + s.dm + s.oa + s.osteo + s.inj + s.surg + s.thyr;
  if (tot === 0) return 0;
  const raw = p.htn * (s.htn / tot) + p.dm * (s.dm / tot) + p.oa * (s.oa / tot) +
    p.osteo * (s.osteo / tot) + p.injury * (s.inj / tot) + p.surgical * (s.surg / tot) +
    p.thyroid * (s.thyr / tot);
  return Math.min(100, Math.round(raw * 100));
}

export function sROM(p: PatientRaw, sw: AllSubWeights): number {
  const s = sw.rom;
  const tot = s.flex + s.ext + s.lrot + s.rrot;
  if (tot === 0) return 0;
  const raw = (p.flex * (s.flex / tot) + p.ext * (s.ext / tot) +
    p.lrot * (s.lrot / tot) + p.rrot * (s.rrot / tot)) / 10;
  return Math.min(100, Math.round(raw * 100));
}

export function sSTarT(p: PatientRaw): number {
  return Math.min(100, Math.round(p.start / 9 * 100));
}

export function sPhysio(p: PatientRaw, sw: AllSubWeights): number {
  const s = sw.physio;
  const tot = s.fabl + s.fairl + s.slrl + s.fabr + s.fairr + s.slrr + s.hyp + s.tend + s.tight + s.knots;
  if (tot === 0) return 0;
  const raw = p.fab_l * (s.fabl / tot) + p.fair_l * (s.fairl / tot) + p.slr_l * (s.slrl / tot) +
    p.fab_r * (s.fabr / tot) + p.fair_r * (s.fairr / tot) + p.slr_r * (s.slrr / tot) +
    p.hyp * (s.hyp / tot) + p.tend * (s.tend / tot) + p.tight * (s.tight / tot) +
    p.knots * (s.knots / tot);
  return Math.min(100, Math.round(raw * 100));
}

export function isPhysioNotPerformed(p: PatientRaw): boolean {
  return !!p.physioNotPerformed;
}

function durationPts(yrsStr: string): number {
  const y = parseInt(yrsStr) || 0;
  return [0, 0.25, 0.5, 0.75, 1][Math.min(y, 4)];
}

export function sLife(p: PatientRaw, sw: AllSubWeights, lifeOverride?: LifeOverride): number {
  const s = sw.life;
  const lo = lifeOverride || { smoke: 0, smokeyrs: '0', alcohol: 0, alcoholyrs: '0', sitting: 0, standing: 0 };
  const smokeVal = lo.smoke ? Math.min(1, 0.5 + durationPts(lo.smokeyrs)) : 0;
  const alcoholVal = lo.alcohol ? Math.min(1, 0.5 + durationPts(lo.alcoholyrs)) : 0;
  const sittingVal = lo.sitting || 0;
  const standingVal = lo.standing || 0;
  const injW = (s.lifeinj || 50) / 100;
  const surgW = (s.lifesurg || 50) / 100;
  const smokeW = (s.smoke || 0) / 100;
  const alcoholW = (s.alcohol || 0) / 100;
  const sittingW = (s.sitting || 0) / 100;
  const standingW = (s.standing || 0) / 100;
  const totalSW = injW + surgW + smokeW + alcoholW + sittingW + standingW;
  if (totalSW === 0) return 0;
  const raw = (p.injury * injW + p.surgical * surgW + smokeVal * smokeW +
    alcoholVal * alcoholW + sittingVal * sittingW + standingVal * standingW) / totalSW;
  return Math.min(100, Math.round(raw * 100));
}

export function calcRPI(
  p: PatientRaw,
  W: GroupWeights,
  SW: AllSubWeights,
  lifeOverride?: LifeOverride,
): number {
  const noPhysio = isPhysioNotPerformed(p);
  if (noPhysio) {
    const remainingTotal = W.start + W.rom + W.anthro + W.comor + W.life;
    if (remainingTotal === 0) return 0;
    const wtd = W.start * sSTarT(p) + W.rom * sROM(p, SW) +
      W.anthro * sAnthropo(p, SW) + W.comor * sComor(p, SW) + W.life * sLife(p, SW, lifeOverride);
    return Math.round(wtd / remainingTotal);
  }

  const tw = W.start + W.rom + W.physio + W.anthro + W.comor + W.life;
  if (tw === 0) return 0;
  const wtd = W.start * sSTarT(p) + W.rom * sROM(p, SW) + W.physio * sPhysio(p, SW) +
    W.anthro * sAnthropo(p, SW) + W.comor * sComor(p, SW) + W.life * sLife(p, SW, lifeOverride);
  return Math.round(wtd / tw);
}

export function getTier(rpi: number, tga: number, tar: number): 'Red' | 'Amber' | 'Green' {
  if (rpi >= tar) return 'Red';
  if (rpi >= tga) return 'Amber';
  return 'Green';
}

export function tierColor(t: 'Red' | 'Amber' | 'Green'): string {
  if (t === 'Red') return '#ef4444';
  if (t === 'Amber') return '#f59e0b';
  return '#22c55e';
}

export function riskColor(sr: string): string {
  if (sr === 'H') return '#dc2626';
  if (sr === 'M') return '#b45309';
  if (sr === 'L') return '#15803d';
  return '#64748b';
}

export function riskLabel(sr: string): string {
  if (sr === 'H') return 'High';
  if (sr === 'M') return 'Moderate';
  if (sr === 'L') return 'Low';
  return 'Unclassified';
}

export function getResults(
  patients: PatientRaw[],
  W: GroupWeights,
  SW: AllSubWeights,
  tga: number,
  tar: number,
  lifeOverrides: Record<string, LifeOverride>,
  manualOverrides?: Record<string, 'H' | 'M' | 'L' | 'U'>,
  physioNotPerformed?: Record<string, boolean>,
): PatientResult[] {
  return patients.map((p) => {
    const patient = {
      ...p,
      physioNotPerformed: physioNotPerformed?.[p.name] ?? p.physioNotPerformed ?? false,
    };
    const rpi = calcRPI(patient, W, SW, lifeOverrides[p.name]);
    const sr = (manualOverrides && manualOverrides[p.name]) ? manualOverrides[p.name] : p.sr;
    return { ...patient, sr, rpi, tier: getTier(rpi, tga, tar) };
  });
}

export function getMatchType(sr: string, tier: string): 'Concordant' | 'Partial' | 'Discordant' | null {
  if (sr === 'U') return null;
  const expTier: Record<string, string> = { H: 'Red', M: 'Amber', L: 'Green' };
  const expected = expTier[sr];
  if (expected === tier) return 'Concordant';
  if (
    (sr === 'H' && tier === 'Amber') ||
    (sr === 'L' && tier === 'Amber') ||
    (sr === 'M' && tier !== 'Amber')
  ) return 'Partial';
  return 'Discordant';
}

export function computeStats(results: PatientResult[]) {
  const classed = results.filter((r) => r.sr !== 'U');
  const highs = classed.filter((r) => r.sr === 'H');
  const highRed = highs.filter((r) => r.tier === 'Red');
  const redAll = results.filter((r) => r.tier === 'Red');
  const sens = highs.length ? Math.round(highRed.length / highs.length * 100) : 0;
  const prec = redAll.length ? Math.round(highRed.length / redAll.length * 100) : 0;
  const expMap: Record<string, string> = { H: 'Red', M: 'Amber', L: 'Green' };
  const match = classed.filter((r) => expMap[r.sr] === r.tier).length;
  const acc = classed.length ? Math.round(match / classed.length * 100) : 0;
  const green = results.filter((r) => r.tier === 'Green').length;
  const amber = results.filter((r) => r.tier === 'Amber').length;
  const red = results.filter((r) => r.tier === 'Red').length;
  return { sens, prec, acc, green, amber, red, total: results.length };
}
