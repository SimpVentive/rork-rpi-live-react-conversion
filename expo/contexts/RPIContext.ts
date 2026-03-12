import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { parseAllPatients } from '@/data/patients';
import {
  DEFAULT_WEIGHTS,
  DEFAULT_SUB_WEIGHTS,
  getResults,
  computeStats,
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
import {
  sSTarT, sROM, sPhysio, sAnthropo, sComor, sLife,
} from '@/data/scoring';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/trpc';

export const [RPIProvider, useRPI] = createContextHook(() => {
  const { currentSite, isAdmin, anonymize } = useAuth();
  const queryClient = useQueryClient();

  const siteParam = isAdmin ? 'ALL' : (currentSite || 'ALL');

  const patientsQuery = useQuery({
    queryKey: ['patients', siteParam],
    queryFn: async () => {
      try {
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

  const results = useMemo<PatientResult[]>(
    () => getResults(patients, W, SW, tga, tar, lifeOverrides, manualOverrides),
    [patients, W, SW, tga, tar, lifeOverrides, manualOverrides],
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
    setW((prev) => {
      const keys: (keyof GroupWeights)[] = ['start', 'rom', 'physio', 'anthro', 'comor', 'life'];
      const others = keys.filter((k) => k !== key);
      const newVal = Math.min(value, 100 - others.length);
      const remainder = 100 - newVal;
      const prevOthersSum = others.reduce((s, k) => s + prev[k], 0);
      const next = { ...prev };
      others.forEach((k) => {
        next[k] = prevOthersSum > 0 ? Math.round(prev[k] / prevOthersSum * remainder) : Math.round(remainder / others.length);
      });
      const dist = others.reduce((s, k) => s + next[k], 0);
      const diff = remainder - dist;
      if (diff !== 0) {
        const maxKey = others.reduce((a, b) => next[a] >= next[b] ? a : b);
        next[maxKey] += diff;
      }
      next[key] = newVal;
      return next;
    });
  }, []);

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

  const saveScenario = useCallback(() => {
    const s = computeStats(results);
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
      ts: new Date().toLocaleString(),
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
    return {
      id: Date.now(),
      ts: scenario.ts,
      W: { ...W },
      SW: JSON.parse(JSON.stringify(SW)),
      TGA: tga,
      TAR: tar,
      ...s,
      patients: patientSnapshots,
    } as SavedScenario;
  }, [results, W, SW, tga, tar, lifeOverrides, saveScenarioMutation]);

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
  const isDbConnected = !patientsQuery.isError;

  return useMemo(() => ({
    patients,
    W, setW, updateWeight,
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
  }), [
    patients, W, updateWeight, SW, updateSubWeight, tga, tar,
    lifeOverrides, saveLifeOverride, getLifeOverride,
    manualOverrides, setManualClassification, getEffectiveManualRisk,
    results, filteredResults, stats,
    savedScenarios, saveScenario, deleteScenario, clearAllScenarios,
    selectedPatient, sortCol, sortDir, toggleSort,
    searchQuery, filterRisk, filterTier, filterSite, filterGender,
    getDisplayName, anonymize, isDataLoading, isDbConnected,
  ]);
});
