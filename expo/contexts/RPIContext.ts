import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { parseAllPatients } from '@/data/patients';
import {
  DEFAULT_WEIGHTS,
  DEFAULT_SUB_WEIGHTS,
  getResults,
  computeStats,
  sSTarT,
  sROM,
  sPhysio,
  sAnthropo,
  sComor,
  sLife,
  getMatchType,
} from '@/data/scoring';
import {
  GroupWeights,
  AllSubWeights,
  LifeOverride,
  PatientRaw,
  PatientResult,
  PatientSnapshot,
  SavedScenario,
  SortColumn,
  SortDirection,
} from '@/data/types';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/trpc';

type OptimizationResult = {
  weights: GroupWeights;
  tga: number;
  tar: number;
  stats: { acc: number; sens: number; prec: number };
  combinations: number;
};

export const [RPIProvider, useRPI] = createContextHook(() => {
  const { currentSite, isAdmin, anonymize } = useAuth();
  const queryClient = useQueryClient();

  const siteParam = isAdmin ? 'ALL' : (currentSite || 'ALL');

const [isOfflineMode, setIsOfflineMode] = useState(false);

  const patientsQuery = useQuery({
    queryKey: ['patients', siteParam],
    queryFn: async () => {
      try {
        setIsOfflineMode(false);
        console.log('[RPIContext] Fetching patients from DB, site:', siteParam);
        const dbPatients = await api.patients.list.query({ site: siteParam });
        console.log('[RPIContext] Got', dbPatients.length, 'patients from DB');

        if (dbPatients.length > 0) {
          return dbPatients.map((p: Record<string, unknown>) => ({
            name: p.name as string,
            age: p.age as number,
            g: p.g as 'M' | 'F',
            sr: p.sr as 'H' | 'M' | 'L' | 'U',
            ar: (p.ar as number) || 0,
            gr: (p.gr as number) || 0,
            htn: (p.htn as number) || 0,
            dm: (p.dm as number) || 0,
            oa: (p.oa as number) || 0,
            osteo: (p.osteo as number) || 0,
            injury: (p.injury as number) || 0,
            surgical: (p.surgical as number) || 0,
            thyroid: (p.thyroid as number) || 0,
            flex: (p.flex as number) || 0,
            ext: (p.ext as number) || 0,
            lrot: (p.lrot as number) || 0,
            rrot: (p.rrot as number) || 0,
            start: (p.start as number) || 0,
            fab_l: (p.fab_l as number) || 0,
            fair_l: (p.fair_l as number) || 0,
            slr_l: (p.slr_l as number) || 0,
            fab_r: (p.fab_r as number) || 0,
            fair_r: (p.fair_r as number) || 0,
            slr_r: (p.slr_r as number) || 0,
            hyp: (p.hyp as number) || 0,
            tend: (p.tend as number) || 0,
            tight: (p.tight as number) || 0,
            knots: (p.knots as number) || 0,
            site: p.site as string,
          })) as PatientRaw[];
        }

        console.log('[RPIContext] DB empty, seeding from static data...');
        const staticPatients = parseAllPatients();
        await api.patients.seed.mutate({ patients: staticPatients });
        console.log('[RPIContext] Seed complete, re-fetching...');

        const freshPatients = await api.patients.list.query({ site: siteParam });
        return freshPatients.map((p: Record<string, unknown>) => ({
          name: p.name as string,
          age: p.age as number,
          g: p.g as 'M' | 'F',
          sr: p.sr as 'H' | 'M' | 'L' | 'U',
          ar: (p.ar as number) || 0,
          gr: (p.gr as number) || 0,
          htn: (p.htn as number) || 0,
          dm: (p.dm as number) || 0,
          oa: (p.oa as number) || 0,
          osteo: (p.osteo as number) || 0,
          injury: (p.injury as number) || 0,
          surgical: (p.surgical as number) || 0,
          thyroid: (p.thyroid as number) || 0,
          flex: (p.flex as number) || 0,
          ext: (p.ext as number) || 0,
          lrot: (p.lrot as number) || 0,
          rrot: (p.rrot as number) || 0,
          start: (p.start as number) || 0,
          fab_l: (p.fab_l as number) || 0,
          fair_l: (p.fair_l as number) || 0,
          slr_l: (p.slr_l as number) || 0,
          fab_r: (p.fab_r as number) || 0,
          fair_r: (p.fair_r as number) || 0,
          slr_r: (p.slr_r as number) || 0,
          hyp: (p.hyp as number) || 0,
          tend: (p.tend as number) || 0,
          tight: (p.tight as number) || 0,
          knots: (p.knots as number) || 0,
          site: p.site as string,
        })) as PatientRaw[];
      } catch (err) {
        console.log('[RPIContext] Backend unavailable, using static data. Error:', err);
        setIsOfflineMode(true);
        const staticPatients = parseAllPatients();
        if (!isAdmin && currentSite) {
          return staticPatients.filter((p) => p.site === currentSite);
        }
        return staticPatients;
      }
    },
    staleTime: 30000,
  });

  const manualOverridesQuery = useQuery({
    queryKey: ['manualOverrides', siteParam],
    queryFn: async () => {
      try {
        console.log('[RPIContext] Fetching manual overrides from DB');
        const overrides = await api.overrides.listManual.query({ site: siteParam });
        console.log('[RPIContext] Got manual overrides:', Object.keys(overrides).length);
        return overrides as Record<string, 'H' | 'M' | 'L' | 'U'>;
      } catch (err) {
        console.log('[RPIContext] Failed to fetch manual overrides:', err);
        return {} as Record<string, 'H' | 'M' | 'L' | 'U'>;
      }
    },
    staleTime: 10000,
  });

  const lifeOverridesQuery = useQuery({
    queryKey: ['lifeOverrides', siteParam],
    queryFn: async () => {
      try {
        console.log('[RPIContext] Fetching life overrides from DB');
        const overrides = await api.overrides.listLife.query({ site: siteParam });
        console.log('[RPIContext] Got life overrides:', Object.keys(overrides).length);
        const typed: Record<string, LifeOverride> = {};
        for (const [name, rawData] of Object.entries(overrides)) {
          const d = rawData as Record<string, unknown>;
          typed[name] = {
            smoke: (d.smoke as number) || 0,
            smokeyrs: (d.smokeyrs as string) || '0',
            alcohol: (d.alcohol as number) || 0,
            alcoholyrs: (d.alcoholyrs as string) || '0',
            sitting: (d.sitting as number) || 0,
            standing: (d.standing as number) || 0,
          };
        }
        return typed;
      } catch (err) {
        console.log('[RPIContext] Failed to fetch life overrides:', err);
        return {} as Record<string, LifeOverride>;
      }
    },
    staleTime: 10000,
  });

  const scenariosQuery = useQuery({
    queryKey: ['scenarios', siteParam],
    queryFn: async () => {
      try {
        console.log('[RPIContext] Fetching scenarios from DB');
        const results = await api.scenarios.list.query({ site: siteParam });
        console.log('[RPIContext] Got', results.length, 'scenarios');
        return results.map((s: Record<string, unknown>) => ({
          id: (s.id as string) || String(Date.now()),
          ts: s.ts as string,
          W: (s.weights || {}) as GroupWeights,
          SW: (s.sub_weights || {}) as AllSubWeights,
          TGA: (s.tga as number) || 35,
          TAR: (s.tar as number) || 55,
          green: (s.green as number) || 0,
          amber: (s.amber as number) || 0,
          red: (s.red as number) || 0,
          total: (s.total as number) || 0,
          sens: (s.sens as number) || 0,
          prec: (s.prec as number) || 0,
          acc: (s.acc as number) || 0,
          patients: (s.patients || []) as PatientSnapshot[],
        })) as SavedScenario[];
      } catch (err) {
        console.log('[RPIContext] Failed to fetch scenarios:', err);
        return [] as SavedScenario[];
      }
    },
    staleTime: 10000,
  });

  const patientsRef = useRef<PatientRaw[]>([]);
  const manualOverridesRef = useRef<Record<string, 'H' | 'M' | 'L' | 'U'>>({});
  const lifeOverridesRef = useRef<Record<string, LifeOverride>>({});
  const scenariosRef = useRef<SavedScenario[]>([]);

  if (patientsQuery.data) patientsRef.current = patientsQuery.data;
  if (manualOverridesQuery.data) manualOverridesRef.current = manualOverridesQuery.data;
  if (lifeOverridesQuery.data) lifeOverridesRef.current = lifeOverridesQuery.data;
  if (scenariosQuery.data) scenariosRef.current = scenariosQuery.data;

  const patients = patientsRef.current;
  const manualOverrides = manualOverridesRef.current;
  const lifeOverrides = lifeOverridesRef.current;
  const savedScenarios = scenariosRef.current;

  const anonymizeMap = useMemo(() => {
    const map = new Map<string, string>();
    patients.forEach((p, i) => {
      map.set(p.name, `P${i + 1}`);
    });
    return map;
  }, [patients]);

  const getDisplayName = useCallback((realName: string): string => {
    if (!anonymize) return realName;
    return anonymizeMap.get(realName) || realName;
  }, [anonymize, anonymizeMap]);

  const [W, setW] = useState<GroupWeights>({ ...DEFAULT_WEIGHTS });
  const [SW, setSW] = useState<AllSubWeights>(JSON.parse(JSON.stringify(DEFAULT_SUB_WEIGHTS)));
  const [tga, setTGA] = useState<number>(35);
  const [tar, setTAR] = useState<number>(55);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [sortCol, setSortCol] = useState<SortColumn>('rpi');
  const [sortDir, setSortDir] = useState<SortDirection>(-1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRisk, setFilterRisk] = useState<string>('');
  const [filterTier, setFilterTier] = useState<string>('');
  const [filterSite, setFilterSite] = useState<string>('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [optProgress, setOptProgress] = useState<string>('');
  const [optResults, setOptResults] = useState<OptimizationResult | null>(null);
  const [showOptModal, setShowOptModal] = useState<boolean>(false);
  const [minDomainWeight, setMinDomainWeight] = useState<number>(10);
  const [physioNotPerformedMap, setPhysioNotPerformedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem('MIN_DOMAIN_WEIGHT');
        const value = stored ? parseInt(stored, 10) : NaN;
        if (!Number.isNaN(value) && value >= 1 && value <= 20) {
          setMinDomainWeight(value);
        }
      } catch (err) {
        console.log('[RPIContext] Failed to load min domain weight', err);
      }
    };
    void loadPreference();
  }, []);

  useEffect(() => {
    const savePreference = async () => {
      try {
        await AsyncStorage.setItem('MIN_DOMAIN_WEIGHT', String(minDomainWeight));
      } catch (err) {
        console.log('[RPIContext] Failed to save min domain weight', err);
      }
    };
    void savePreference();
  }, [minDomainWeight]);

  const results = useMemo<PatientResult[]>(
    () => getResults(patients, W, SW, tga, tar, lifeOverrides, manualOverrides, physioNotPerformedMap),
    [patients, W, SW, tga, tar, lifeOverrides, manualOverrides, physioNotPerformedMap],
  );

  const stats = useMemo(() => computeStats(results), [results]);

  const filteredResults = useMemo(() => {
    let rows = results;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (filterRisk) rows = rows.filter((r) => r.sr === filterRisk);
    if (filterTier) rows = rows.filter((r) => r.tier === filterTier);
    if (filterSite) rows = rows.filter((r) => r.site === filterSite);
    if (filterGender) rows = rows.filter((r) => r.g === filterGender);
    rows = [...rows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.toLowerCase() < bv.toLowerCase() ? -sortDir : av.toLowerCase() > bv.toLowerCase() ? sortDir : 0;
      }
      return (av as number) < (bv as number) ? -sortDir : (av as number) > (bv as number) ? sortDir : 0;
    });
    return rows;
  }, [results, searchQuery, filterRisk, filterTier, filterSite, filterGender, sortCol, sortDir]);

  const updateWeight = useCallback((key: keyof GroupWeights, value: number) => {
    setW((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(100, Math.round(value))),
    }));
  }, []);

  const weightTotal = useMemo(() => {
    return W.start + W.rom + W.physio + W.anthro + W.comor + W.life;
  }, [W]);

  const setPhysioNotPerformed = useCallback((name: string, value: boolean) => {
    console.log('[RPIContext] physio not performed toggle', name, value);
    setPhysioNotPerformedMap((prev) => ({ ...prev, [name]: value }));
  }, []);

  const isPhysioNotPerformed = useCallback((name: string) => !!physioNotPerformedMap[name], [physioNotPerformedMap]);

  const runOptimization = useCallback(async (overrideMinWeight?: number) => {
    setOptimizing(true);
    setOptProgress('Starting optimization...');

    const classifiedPatients = patients.filter((p) => p.sr !== 'U');
    const minWeight = Math.max(1, Math.min(20, Math.round(overrideMinWeight ?? minDomainWeight)));
    const maxWeight = 50;

    let bestResult: OptimizationResult = {
      weights: { start: 35, rom: 25, physio: 15, anthro: 12, comor: 8, life: 5 },
      tga: 35,
      tar: 55,
      stats: { acc: 0, sens: 0, prec: 0 },
      combinations: 0,
    };

    let tested = 0;
    const totalIterations = 10000;

    for (let i = 0; i < totalIterations; i++) {
      // Generate random weights within constraints
      let weights: number[] = [];
      for (let j = 0; j < 6; j++) {
        weights.push(Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight);
      }
      // Normalize to sum to 100
      const sum = weights.reduce((a, b) => a + b, 0);
      weights = weights.map(w => Math.round((w / sum) * 100));
      // Adjust to exactly 100
      let total = weights.reduce((a, b) => a + b, 0);
      while (total !== 100) {
        if (total > 100) {
          const idx = Math.floor(Math.random() * 6);
          if (weights[idx] > minWeight) {
            weights[idx]--;
            total--;
          }
        } else {
          const idx = Math.floor(Math.random() * 6);
          if (weights[idx] < maxWeight) {
            weights[idx]++;
            total++;
          }
        }
      }

      const testWeights: GroupWeights = {
        start: weights[0],
        rom: weights[1],
        physio: weights[2],
        anthro: weights[3],
        comor: weights[4],
        life: weights[5],
      };

      // Generate TGA and TAR within ranges, TGA < TAR
      const testTga = Math.floor(Math.random() * (45 - 25 + 1)) + 25;
      let testTar = Math.floor(Math.random() * (70 - 46 + 1)) + 46;
      if (testTar <= testTga) testTar = testTga + 1;

      const results = getResults(classifiedPatients, testWeights, DEFAULT_SUB_WEIGHTS, testTga, testTar, lifeOverrides, manualOverrides);
      const stats = computeStats(results);

      tested++;
      if (tested % 500 === 0) {
        setOptProgress(`Testing... ${tested}/${totalIterations} combinations`);
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      if (stats.acc > bestResult.stats.acc ||
          (stats.acc === bestResult.stats.acc && stats.sens > bestResult.stats.sens)) {
        bestResult = {
          weights: { ...testWeights },
          tga: testTga,
          tar: testTar,
          stats: { acc: stats.acc, sens: stats.sens, prec: stats.prec },
          combinations: tested,
        };
      }
    }

    setOptResults(bestResult);
    setOptimizing(false);
    setShowOptModal(true);
  }, [patients, lifeOverrides, manualOverrides, minDomainWeight]);

  const applyOptimalWeights = useCallback(() => {
    if (!optResults) return;
    setW(optResults.weights);
    setTga(optResults.tga);
    setTar(optResults.tar);
    setShowOptModal(false);
  }, [optResults]);

  const saveManualMutation = useMutation({
    mutationFn: async (params: { name: string; risk: 'H' | 'M' | 'L' | 'U' }) => {
      console.log('[RPIContext] Saving manual classification:', params.name, '->', params.risk);
      return api.overrides.setManual.mutate({
        patient_name: params.name,
        site: siteParam,
        risk: params.risk,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manualOverrides'] });
    },
  });

  const setManualClassification = useCallback((name: string, risk: 'H' | 'M' | 'L' | 'U') => {
    saveManualMutation.mutate({ name, risk });
  }, [saveManualMutation]);

  const getEffectiveManualRisk = useCallback((name: string, originalSr: 'H' | 'M' | 'L' | 'U'): 'H' | 'M' | 'L' | 'U' => {
    return manualOverrides[name] ?? originalSr;
  }, [manualOverrides]);

  const saveLifeMutation = useMutation({
    mutationFn: async (params: { name: string; override: LifeOverride }) => {
      console.log('[RPIContext] Saving life override for:', params.name);
      return api.overrides.setLife.mutate({
        patient_name: params.name,
        site: siteParam,
        ...params.override,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lifeOverrides'] });
    },
  });

  const saveLifeOverride = useCallback((name: string, field: string, val: string | number) => {
    const current = lifeOverrides[name] || { smoke: 0, smokeyrs: '0', alcohol: 0, alcoholyrs: '0', sitting: 0, standing: 0 };
    const numFields = ['smoke', 'alcohol', 'sitting', 'standing'];
    const updated: LifeOverride = {
      ...current,
      [field]: numFields.includes(field) ? (parseInt(String(val)) || 0) : val,
    };
    saveLifeMutation.mutate({ name, override: updated });
  }, [lifeOverrides, saveLifeMutation]);

  const getLifeOverride = useCallback((name: string): LifeOverride => {
    return lifeOverrides[name] || { smoke: 0, smokeyrs: '0', alcohol: 0, alcoholyrs: '0', sitting: 0, standing: 0 };
  }, [lifeOverrides]);

  const saveScenarioMutation = useMutation({
    mutationFn: async (scenario: {
      ts: string;
      weights: Record<string, number>;
      sub_weights: Record<string, unknown>;
      tga: number;
      tar: number;
      green: number;
      amber: number;
      red: number;
      total: number;
      sens: number;
      prec: number;
      acc: number;
      patients: PatientSnapshot[];
    }) => {
      console.log('[RPIContext] Saving scenario to DB');
      return api.scenarios.save.mutate({
        site: siteParam,
        ...scenario,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });

  const savePatientResultsMutation = useMutation({
    mutationFn: async (payload: { results: Array<Record<string, unknown>> }) => {
      console.log('[RPIContext] Saving patient results to DB, count:', payload.results.length);
      return api.patientResults.saveBatch.mutate(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patientResults'] });
    },
  });

  const saveCohortAnalysisMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      console.log('[RPIContext] Saving cohort analysis to DB');
      return api.cohortAnalysis.save.mutate(payload as Parameters<typeof api.cohortAnalysis.save.mutate>[0]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cohortAnalysis'] });
    },
  });

  const saveScenario = useCallback(() => {
    const s = computeStats(results);
    const scenarioId = `scenario:${Date.now()}`;
    const ts = new Date().toLocaleString();

    const patientSnapshots: PatientSnapshot[] = results.map((p) => ({
      name: p.name,
      rpi: p.rpi,
      tier: p.tier,
      manualRisk: p.sr,
      domainScores: {
        start: sSTarT(p),
        rom: sROM(p, SW),
        physio: sPhysio(p, SW),
        anthro: sAnthropo(p, SW),
        comor: sComor(p, SW),
        life: sLife(p, SW, lifeOverrides[p.name]),
      },
    }));

    const scenario = {
      ts,
      weights: W as unknown as Record<string, number>,
      sub_weights: SW as unknown as Record<string, unknown>,
      tga,
      tar,
      green: s.green,
      amber: s.amber,
      red: s.red,
      total: s.total,
      sens: s.sens,
      prec: s.prec,
      acc: s.acc,
      patients: patientSnapshots,
    };
    saveScenarioMutation.mutate(scenario);

    const mapRiskToNumeric = (sr: string): number => {
      if (sr === 'H') return 3;
      if (sr === 'M') return 2;
      if (sr === 'L') return 1;
      return 0;
    };
    const mapTierToNumeric = (tier: 'Red' | 'Amber' | 'Green'): number => {
      if (tier === 'Red') return 3;
      if (tier === 'Amber') return 2;
      return 1;
    };

    try {
      const classifiedResults = results.filter((r) => r.sr !== 'U');
      const patientResultRows = classifiedResults.map((p) => {
        const lo = lifeOverrides[p.name] || { smoke: 0, smokeyrs: '0', alcohol: 0, alcoholyrs: '0', sitting: 0, standing: 0 };
        const rpiN = mapTierToNumeric(p.tier);
        const manualN = mapRiskToNumeric(p.sr);
        const ratio = manualN > 0 ? parseFloat((rpiN / manualN).toFixed(2)) : 0;
        const mt = getMatchType(p.sr, p.tier);
        return {
          scenario_id: scenarioId,
          patient_name: p.name,
          site: p.site,
          age: p.age,
          gender: p.g,
          manual_risk: p.sr,
          ar: p.ar,
          gr: p.gr,
          htn: p.htn,
          dm: p.dm,
          oa: p.oa,
          osteo: p.osteo,
          injury: p.injury,
          surgical: p.surgical,
          thyroid: p.thyroid,
          flex: p.flex,
          ext: p.ext,
          lrot: p.lrot,
          rrot: p.rrot,
          start_raw: p.start,
          fab_l: p.fab_l,
          fair_l: p.fair_l,
          slr_l: p.slr_l,
          fab_r: p.fab_r,
          fair_r: p.fair_r,
          slr_r: p.slr_r,
          hyp: p.hyp,
          tend: p.tend,
          tight: p.tight,
          knots: p.knots,
          smoke: lo.smoke,
          smokeyrs: lo.smokeyrs,
          alcohol: lo.alcohol,
          alcoholyrs: lo.alcoholyrs,
          sitting: lo.sitting,
          standing: lo.standing,
          score_start: sSTarT(p),
          score_rom: sROM(p, SW),
          score_physio: sPhysio(p, SW),
          score_anthro: sAnthropo(p, SW),
          score_comor: sComor(p, SW),
          score_life: sLife(p, SW, lo),
          rpi: p.rpi,
          tier: p.tier,
          rpi_numeric: rpiN,
          manual_numeric: manualN,
          ratio,
          ratio_distance: Math.abs(ratio - 1.0),
          match_type: mt || 'Unclassified',
        };
      });
      savePatientResultsMutation.mutate({ results: patientResultRows });

      const groups: Record<string, PatientResult[]> = { H: [], M: [], L: [], U: [] };
      results.forEach((r) => { if (groups[r.sr]) groups[r.sr].push(r); });
      const avg = (arr: PatientResult[], fn: (p: PatientResult) => number) =>
        arr.length ? Math.round(arr.reduce((sum, p) => sum + fn(p), 0) / arr.length) : 0;

      const concordance = { concordant: 0, partial: 0, discordant: 0, unclassified: 0 };
      results.forEach((r) => {
        const mt = getMatchType(r.sr, r.tier);
        if (mt === 'Concordant') concordance.concordant++;
        else if (mt === 'Partial') concordance.partial++;
        else if (mt === 'Discordant') concordance.discordant++;
        else concordance.unclassified++;
      });

      const sites = ['KIMS', 'Kues', 'Abhis', 'SDD'];
      const siteBreakdown = sites.map((site) => {
        const sp = results.filter((r) => r.site === site);
        const cl = sp.filter((r) => r.sr !== 'U');
        const highs = cl.filter((r) => r.sr === 'H');
        const highRed = highs.filter((r) => r.tier === 'Red');
        return {
          site,
          total: sp.length,
          green: sp.filter((r) => r.tier === 'Green').length,
          amber: sp.filter((r) => r.tier === 'Amber').length,
          red: sp.filter((r) => r.tier === 'Red').length,
          classified: cl.length,
          sensitivity: highs.length ? Math.round(highRed.length / highs.length * 100) : null,
        };
      });

      const totalRatios = classifiedResults.map((r) => {
        const rpiN = mapTierToNumeric(r.tier);
        const manualN = mapRiskToNumeric(r.sr);
        return manualN > 0 ? rpiN / manualN : 0;
      });
      const avgRatio = totalRatios.length > 0
        ? parseFloat((totalRatios.reduce((a, b) => a + b, 0) / totalRatios.length).toFixed(2))
        : 0;
      const perfectMatchCount = totalRatios.filter((r) => Math.abs(r - 1.0) < 0.001).length;

      saveCohortAnalysisMutation.mutate({
        scenario_id: scenarioId,
        site: siteParam,
        ts,
        total_patients: results.length,
        classified_patients: classifiedResults.length,
        green_count: s.green,
        amber_count: s.amber,
        red_count: s.red,
        sensitivity: s.sens,
        precision_val: s.prec,
        accuracy: s.acc,
        concordant: concordance.concordant,
        partial: concordance.partial,
        discordant: concordance.discordant,
        unclassified: concordance.unclassified,
        avg_rpi_high: avg(groups.H, (p) => p.rpi),
        avg_rpi_mod: avg(groups.M, (p) => p.rpi),
        avg_rpi_low: avg(groups.L, (p) => p.rpi),
        avg_ratio: avgRatio,
        perfect_match_count: perfectMatchCount,
        domain_avg_start_high: avg(groups.H, (p) => sSTarT(p)),
        domain_avg_start_mod: avg(groups.M, (p) => sSTarT(p)),
        domain_avg_start_low: avg(groups.L, (p) => sSTarT(p)),
        domain_avg_rom_high: avg(groups.H, (p) => sROM(p, SW)),
        domain_avg_rom_mod: avg(groups.M, (p) => sROM(p, SW)),
        domain_avg_rom_low: avg(groups.L, (p) => sROM(p, SW)),
        domain_avg_physio_high: avg(groups.H, (p) => sPhysio(p, SW)),
        domain_avg_physio_mod: avg(groups.M, (p) => sPhysio(p, SW)),
        domain_avg_physio_low: avg(groups.L, (p) => sPhysio(p, SW)),
        domain_avg_anthro_high: avg(groups.H, (p) => sAnthropo(p, SW)),
        domain_avg_anthro_mod: avg(groups.M, (p) => sAnthropo(p, SW)),
        domain_avg_anthro_low: avg(groups.L, (p) => sAnthropo(p, SW)),
        domain_avg_comor_high: avg(groups.H, (p) => sComor(p, SW)),
        domain_avg_comor_mod: avg(groups.M, (p) => sComor(p, SW)),
        domain_avg_comor_low: avg(groups.L, (p) => sComor(p, SW)),
        domain_avg_life_high: avg(groups.H, (p) => sLife(p, SW, lifeOverrides[p.name])),
        domain_avg_life_mod: avg(groups.M, (p) => sLife(p, SW, lifeOverrides[p.name])),
        domain_avg_life_low: avg(groups.L, (p) => sLife(p, SW, lifeOverrides[p.name])),
        site_breakdown: siteBreakdown,
        weights: W as unknown as Record<string, number>,
        sub_weights: SW as unknown as Record<string, unknown>,
        tga,
        tar,
      } as Parameters<typeof api.cohortAnalysis.save.mutate>[0]);
    } catch (err) {
      console.log('[RPIContext] Failed to save patient results/cohort analysis:', err);
    }

    return {
      id: Date.now(),
      ts,
      W: { ...W },
      SW: JSON.parse(JSON.stringify(SW)),
      TGA: tga,
      TAR: tar,
      ...s,
      patients: patientSnapshots,
    } as SavedScenario;
  }, [results, W, SW, tga, tar, lifeOverrides, saveScenarioMutation, savePatientResultsMutation, saveCohortAnalysisMutation, siteParam]);

  const deleteScenarioMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[RPIContext] Deleting scenario:', id);
      return api.scenarios.delete.mutate({ id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });

  const deleteScenario = useCallback((id: number | string) => {
    deleteScenarioMutation.mutate(String(id));
  }, [deleteScenarioMutation]);

  const clearAllScenariosMutation = useMutation({
    mutationFn: async () => {
      console.log('[RPIContext] Clearing all scenarios');
      return api.scenarios.clearAll.mutate({ site: siteParam });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });

  const clearAllScenarios = useCallback(() => {
    clearAllScenariosMutation.mutate();
  }, [clearAllScenariosMutation]);

  const toggleSort = useCallback((col: SortColumn) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === 1 ? -1 : 1) as SortDirection);
        return prev;
      }
      setSortDir(-1);
      return col;
    });
  }, []);

  const updateSubWeight = useCallback((domain: keyof AllSubWeights, key: string, value: number) => {
    setSW((prev) => {
      const domainObj = { ...prev[domain] } as Record<string, number>;
      const keys = Object.keys(domainObj);
      const others = keys.filter((k) => k !== key);
      const newVal = Math.min(value, 100 - others.length);
      const remainder = 100 - newVal;
      const prevOthersSum = others.reduce((s, k) => s + (domainObj[k] || 0), 0);
      others.forEach((k) => {
        domainObj[k] = prevOthersSum > 0
          ? Math.round((domainObj[k] || 0) / prevOthersSum * remainder)
          : Math.round(remainder / others.length);
      });
      const dist = others.reduce((s, k) => s + domainObj[k], 0);
      const diff = remainder - dist;
      if (diff !== 0) {
        const maxKey = others.reduce((a, b) => domainObj[a] >= domainObj[b] ? a : b);
        domainObj[maxKey] += diff;
        if (domainObj[maxKey] < 0) domainObj[maxKey] = 0;
      }
      domainObj[key] = newVal;
      return { ...prev, [domain]: domainObj } as AllSubWeights;
    });
  }, []);

  const isDataLoading = patientsQuery.isLoading || manualOverridesQuery.isLoading || lifeOverridesQuery.isLoading;
  const isDbConnected = !isOfflineMode && !patientsQuery.isError;

  return useMemo(() => ({
    patients,
    W, setW, updateWeight, weightTotal,
    SW, setSW, updateSubWeight,
    tga, setTGA, tar, setTAR,
    lifeOverrides, saveLifeOverride, getLifeOverride,
    manualOverrides, setManualClassification, getEffectiveManualRisk,
    results, filteredResults, stats,
    savedScenarios, saveScenario, deleteScenario, clearAllScenarios,
    selectedPatient, setSelectedPatient,
    sortCol, sortDir, toggleSort,
    searchQuery, setSearchQuery,
    filterRisk, setFilterRisk,
    filterTier, setFilterTier,
    filterSite, setFilterSite,
    filterGender, setFilterGender,
    getDisplayName,
    anonymize,
    isDataLoading,
    isDbConnected,
    optimizing,
    optProgress,
    optResults,
    showOptModal,
    setShowOptModal,
    runOptimization,
    minDomainWeight,
    setMinDomainWeight,
    setPhysioNotPerformed,
    isPhysioNotPerformed,
    applyOptimalWeights,
  }), [
    patients, W, updateWeight, weightTotal, SW, updateSubWeight, tga, tar,
    lifeOverrides, saveLifeOverride, getLifeOverride,
    manualOverrides, setManualClassification, getEffectiveManualRisk,
    results, filteredResults, stats,
    savedScenarios, saveScenario, deleteScenario, clearAllScenarios,
    selectedPatient, sortCol, sortDir, toggleSort,
    searchQuery, filterRisk, filterTier, filterSite, filterGender,
    getDisplayName, anonymize, isDataLoading, isDbConnected,
    optimizing, optProgress, optResults, showOptModal, setShowOptModal, runOptimization, minDomainWeight, setMinDomainWeight, setPhysioNotPerformed, isPhysioNotPerformed, applyOptimalWeights,
  ]);
});
