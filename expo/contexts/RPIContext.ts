import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const SCENARIOS_KEY = 'rpi_saved_scenarios';
const LIFE_OVERRIDES_KEY = 'rpi_life_overrides';
const MANUAL_OVERRIDES_KEY = 'rpi_manual_overrides';

export const [RPIProvider, useRPI] = createContextHook(() => {
  const { currentSite, isAdmin, anonymize } = useAuth();
  const [allPatients] = useState<PatientRaw[]>(parseAllPatients);

  const patients = useMemo(() => {
    if (!currentSite || isAdmin) return allPatients;
    return allPatients.filter((p) => p.site === currentSite);
  }, [allPatients, currentSite, isAdmin]);

  const anonymizeMap = useMemo(() => {
    const map = new Map<string, string>();
    allPatients.forEach((p, i) => {
      map.set(p.name, `P${i + 1}`);
    });
    return map;
  }, [allPatients]);

  const getDisplayName = useCallback((realName: string): string => {
    if (!anonymize) return realName;
    return anonymizeMap.get(realName) || realName;
  }, [anonymize, anonymizeMap]);
  const [W, setW] = useState<GroupWeights>({ ...DEFAULT_WEIGHTS });
  const [SW, setSW] = useState<AllSubWeights>(JSON.parse(JSON.stringify(DEFAULT_SUB_WEIGHTS)));
  const [tga, setTGA] = useState<number>(35);
  const [tar, setTAR] = useState<number>(55);
  const [lifeOverrides, setLifeOverrides] = useState<Record<string, LifeOverride>>({});
  const [manualOverrides, setManualOverrides] = useState<Record<string, 'H' | 'M' | 'L' | 'U'>>({});
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [sortCol, setSortCol] = useState<SortColumn>('rpi');
  const [sortDir, setSortDir] = useState<SortDirection>(-1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRisk, setFilterRisk] = useState<string>('');
  const [filterTier, setFilterTier] = useState<string>('');
  const [filterSite, setFilterSite] = useState<string>('');
  const [filterGender, setFilterGender] = useState<string>('');

  useEffect(() => {
    void AsyncStorage.getItem(SCENARIOS_KEY).then((val) => {
      if (val) {
        try { setSavedScenarios(JSON.parse(val)); } catch (e) { console.log('Failed to parse scenarios', e); }
      }
    });
    void AsyncStorage.getItem(LIFE_OVERRIDES_KEY).then((val) => {
      if (val) {
        try { setLifeOverrides(JSON.parse(val)); } catch (e) { console.log('Failed to parse life overrides', e); }
      }
    });
    void AsyncStorage.getItem(MANUAL_OVERRIDES_KEY).then((val) => {
      if (val) {
        try { setManualOverrides(JSON.parse(val)); } catch (e) { console.log('Failed to parse manual overrides', e); }
      }
    });
  }, []);

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

  const saveLifeOverride = useCallback((name: string, field: string, val: string | number) => {
    setLifeOverrides((prev) => {
      const current = prev[name] || { smoke: 0, smokeyrs: '0', alcohol: 0, alcoholyrs: '0', sitting: 0, standing: 0 };
      const numFields = ['smoke', 'alcohol', 'sitting', 'standing'];
      const updated = {
        ...prev,
        [name]: {
          ...current,
          [field]: numFields.includes(field) ? (parseInt(String(val)) || 0) : val,
        },
      };
      void AsyncStorage.setItem(LIFE_OVERRIDES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setManualClassification = useCallback((name: string, risk: 'H' | 'M' | 'L' | 'U') => {
    setManualOverrides((prev) => {
      const next = { ...prev, [name]: risk };
      void AsyncStorage.setItem(MANUAL_OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getEffectiveManualRisk = useCallback((name: string, originalSr: 'H' | 'M' | 'L' | 'U'): 'H' | 'M' | 'L' | 'U' => {
    return manualOverrides[name] ?? originalSr;
  }, [manualOverrides]);

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
    const scenario: SavedScenario = {
      id: Date.now(),
      ts: new Date().toLocaleString(),
      W: { ...W },
      SW: JSON.parse(JSON.stringify(SW)),
      TGA: tga,
      TAR: tar,
      green: s.green,
      amber: s.amber,
      red: s.red,
      total: s.total,
      sens: s.sens,
      prec: s.prec,
      acc: s.acc,
      patients: patientSnapshots,
    };
    setSavedScenarios((prev) => {
      const next = [scenario, ...prev];
      void AsyncStorage.setItem(SCENARIOS_KEY, JSON.stringify(next));
      return next;
    });
    return scenario;
  }, [results, W, SW, tga, tar, lifeOverrides]);

  const deleteScenario = useCallback((id: number) => {
    setSavedScenarios((prev) => {
      const next = prev.filter((s) => s.id !== id);
      void AsyncStorage.setItem(SCENARIOS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearAllScenarios = useCallback(() => {
    setSavedScenarios([]);
    void AsyncStorage.removeItem(SCENARIOS_KEY);
  }, []);

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

  const getLifeOverride = useCallback((name: string): LifeOverride => {
    return lifeOverrides[name] || { smoke: 0, smokeyrs: '0', alcohol: 0, alcoholyrs: '0', sitting: 0, standing: 0 };
  }, [lifeOverrides]);

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
  }), [
    patients, W, updateWeight, SW, updateSubWeight, tga, tar,
    lifeOverrides, saveLifeOverride, getLifeOverride,
    manualOverrides, setManualClassification, getEffectiveManualRisk,
    results, filteredResults, stats,
    savedScenarios, saveScenario, deleteScenario, clearAllScenarios,
    selectedPatient, sortCol, sortDir, toggleSort,
    searchQuery, filterRisk, filterTier, filterSite, filterGender,
    getDisplayName, anonymize,
  ]);
});
