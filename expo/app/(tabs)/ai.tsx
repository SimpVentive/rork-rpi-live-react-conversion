import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BrainCircuit, Trophy, ChevronDown, ChevronRight, AlertTriangle,
  Zap, RotateCcw, TrendingUp,
} from 'lucide-react-native';
import { useRPI } from '@/contexts/RPIContext';
import {
  sSTarT, sROM, sPhysio, sAnthropo, sComor, sLife,
  calcRPI, getTier,
} from '@/data/scoring';
import { PatientResult, GroupWeights } from '@/data/types';
import Slider from '@/components/Slider';
import * as Haptics from 'expo-haptics';

interface AIPatientRow {
  name: string;
  displayName: string;
  age: number;
  gender: string;
  site: string;
  manualRisk: string;
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
  startRaw: number;
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
  startScore: number;
  romScore: number;
  physioScore: number;
  anthroScore: number;
  comorScore: number;
  lifeScore: number;
  rpiScore: number;
  rpiTier: 'Red' | 'Amber' | 'Green';
  rpiNumeric: number;
  manualNumeric: number;
  ratio: number;
  ratioDistance: number;
}

function mapRiskToNumeric(sr: string): number {
  if (sr === 'H') return 3;
  if (sr === 'M') return 2;
  if (sr === 'L') return 1;
  return 0;
}

function mapTierToNumeric(tier: 'Red' | 'Amber' | 'Green'): number {
  if (tier === 'Red') return 3;
  if (tier === 'Amber') return 2;
  return 1;
}

type SortKey = 'name' | 'age' | 'rpi' | 'ratio';

type ColumnSection = 'demographics' | 'comorbidities' | 'rom' | 'start' | 'physio' | 'scores' | 'result';

const SECTION_LABELS: Record<ColumnSection, string> = {
  demographics: 'Demographics',
  comorbidities: 'Comorbidities',
  rom: 'ROM',
  start: 'STarT',
  physio: 'Physio Assessment',
  scores: 'Domain Scores',
  result: 'RPI Result',
};

interface ColDef {
  key: string;
  label: string;
  width: number;
  section: ColumnSection;
  getValue: (row: AIPatientRow) => string | number;
  align?: 'left' | 'center';
}

const COLUMNS: ColDef[] = [
  { key: 'name', label: 'Patient', width: 130, section: 'demographics', getValue: (r) => r.displayName, align: 'left' },
  { key: 'age', label: 'Age', width: 44, section: 'demographics', getValue: (r) => r.age },
  { key: 'gender', label: 'G', width: 34, section: 'demographics', getValue: (r) => r.gender },
  { key: 'site', label: 'Site', width: 52, section: 'demographics', getValue: (r) => r.site },
  { key: 'manual', label: 'Risk', width: 44, section: 'demographics', getValue: (r) => r.manualRisk },
  { key: 'ar', label: 'AR', width: 34, section: 'demographics', getValue: (r) => r.ar },
  { key: 'gr', label: 'GR', width: 34, section: 'demographics', getValue: (r) => r.gr },
  { key: 'htn', label: 'HTN', width: 40, section: 'comorbidities', getValue: (r) => r.htn },
  { key: 'dm', label: 'DM', width: 34, section: 'comorbidities', getValue: (r) => r.dm },
  { key: 'oa', label: 'OA', width: 34, section: 'comorbidities', getValue: (r) => r.oa },
  { key: 'osteo', label: 'Ost', width: 36, section: 'comorbidities', getValue: (r) => r.osteo },
  { key: 'injury', label: 'Inj', width: 34, section: 'comorbidities', getValue: (r) => r.injury },
  { key: 'surgical', label: 'Surg', width: 40, section: 'comorbidities', getValue: (r) => r.surgical },
  { key: 'thyroid', label: 'Thyr', width: 40, section: 'comorbidities', getValue: (r) => r.thyroid },
  { key: 'flex', label: 'Flex', width: 40, section: 'rom', getValue: (r) => r.flex },
  { key: 'ext', label: 'Ext', width: 38, section: 'rom', getValue: (r) => r.ext },
  { key: 'lrot', label: 'LRot', width: 40, section: 'rom', getValue: (r) => r.lrot },
  { key: 'rrot', label: 'RRot', width: 42, section: 'rom', getValue: (r) => r.rrot },
  { key: 'startRaw', label: 'STarT', width: 46, section: 'start', getValue: (r) => r.startRaw },
  { key: 'fab_l', label: 'FabL', width: 40, section: 'physio', getValue: (r) => r.fab_l },
  { key: 'fair_l', label: 'FairL', width: 42, section: 'physio', getValue: (r) => r.fair_l },
  { key: 'slr_l', label: 'SLRL', width: 40, section: 'physio', getValue: (r) => r.slr_l },
  { key: 'fab_r', label: 'FabR', width: 40, section: 'physio', getValue: (r) => r.fab_r },
  { key: 'fair_r', label: 'FairR', width: 42, section: 'physio', getValue: (r) => r.fair_r },
  { key: 'slr_r', label: 'SLRR', width: 40, section: 'physio', getValue: (r) => r.slr_r },
  { key: 'hyp', label: 'Hyp', width: 36, section: 'physio', getValue: (r) => r.hyp },
  { key: 'tend', label: 'Tend', width: 40, section: 'physio', getValue: (r) => r.tend },
  { key: 'tight', label: 'Tight', width: 42, section: 'physio', getValue: (r) => r.tight },
  { key: 'knots', label: 'Knots', width: 42, section: 'physio', getValue: (r) => r.knots },
  { key: 'startScore', label: 'S-STarT', width: 54, section: 'scores', getValue: (r) => r.startScore },
  { key: 'romScore', label: 'S-ROM', width: 50, section: 'scores', getValue: (r) => r.romScore },
  { key: 'physioScore', label: 'S-Phy', width: 48, section: 'scores', getValue: (r) => r.physioScore },
  { key: 'anthroScore', label: 'S-Anth', width: 50, section: 'scores', getValue: (r) => r.anthroScore },
  { key: 'comorScore', label: 'S-Com', width: 48, section: 'scores', getValue: (r) => r.comorScore },
  { key: 'lifeScore', label: 'S-Life', width: 48, section: 'scores', getValue: (r) => r.lifeScore },
  { key: 'rpiScore', label: 'RPI', width: 50, section: 'result', getValue: (r) => r.rpiScore },
  { key: 'rpiTier', label: 'Tier', width: 52, section: 'result', getValue: (r) => r.rpiTier },
  { key: 'ratio', label: 'RPI/Man', width: 64, section: 'result', getValue: (r) => r.ratio.toFixed(2) },
];

const DOMAIN_COLORS: Record<string, string> = {
  start: '#60a5fa',
  rom: '#22c55e',
  physio: '#a78bfa',
  anthro: '#f59e0b',
  comor: '#ef4444',
  life: '#94a3b8',
};

const DOMAIN_LABELS: Record<string, string> = {
  start: 'STarT',
  rom: 'ROM',
  physio: 'Physio',
  anthro: 'Anthro',
  comor: 'Comorbid',
  life: 'Lifestyle',
};

type ActiveTab = 'table' | 'sensitivity';

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const { results, patients, SW, W, tga, tar, getLifeOverride, getDisplayName, lifeOverrides, weightTotal } = useRPI();
  const [sortKey, setSortKey] = useState<SortKey>('ratio');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [filterSite, setFilterSite] = useState<string>('');
  const [collapsedSections, setCollapsedSections] = useState<Set<ColumnSection>>(new Set());
  const [activeTab, setActiveTab] = useState<ActiveTab>('table');

  const [simW, setSimW] = useState<GroupWeights>({ ...W });
  const [simTGA, setSimTGA] = useState<number>(tga);
  const [simTAR, setSimTAR] = useState<number>(tar);

  const simTotal = simW.start + simW.rom + simW.physio + simW.anthro + simW.comor + simW.life;

  const handleSimWeightChange = useCallback((key: keyof GroupWeights, val: number) => {
    setSimW((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(100, Math.round(val))),
    }));
  }, []);

  const resetSimToLive = useCallback(() => {
    setSimW({ ...W });
    setSimTGA(tga);
    setSimTAR(tar);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [W, tga, tar]);

  const simResults = useMemo(() => {
    return patients.map((p) => {
      const lo = lifeOverrides[p.name] || { smoke: 0, smokeyrs: '0', alcohol: 0, alcoholyrs: '0', sitting: 0, standing: 0 };
      const rpi = calcRPI(p, simW, SW, lo);
      const tier = getTier(rpi, simTGA, simTAR);
      return { ...p, rpi, tier };
    });
  }, [patients, simW, SW, simTGA, simTAR, lifeOverrides]);

  const simAnalysis = useMemo(() => {
    const classified = simResults.filter((r: PatientResult) => r.sr !== 'U');
    let perfectCount = 0;
    let totalRatio = 0;
    let totalDistance = 0;

    classified.forEach((r) => {
      const rpiN = mapTierToNumeric(r.tier);
      const manualN = mapRiskToNumeric(r.sr);
      const ratio = manualN > 0 ? rpiN / manualN : 0;
      const distance = Math.abs(ratio - 1.0);
      if (Math.abs(ratio - 1.0) < 0.001) perfectCount++;
      totalRatio += ratio;
      totalDistance += distance;
    });

    const avgRatio = classified.length > 0 ? totalRatio / classified.length : 0;
    const avgDistance = classified.length > 0 ? totalDistance / classified.length : 0;
    const greens = simResults.filter((r: PatientResult) => r.tier === 'Green').length;
    const ambers = simResults.filter((r: PatientResult) => r.tier === 'Amber').length;
    const reds = simResults.filter((r: PatientResult) => r.tier === 'Red').length;

    const highs = classified.filter((r) => r.sr === 'H');
    const highRed = highs.filter((r) => r.tier === 'Red');
    const sens = highs.length ? Math.round(highRed.length / highs.length * 100) : 0;

    const expMap: Record<string, string> = { H: 'Red', M: 'Amber', L: 'Green' };
    const match = classified.filter((r) => expMap[r.sr] === r.tier).length;
    const acc = classified.length ? Math.round(match / classified.length * 100) : 0;

    return { perfectCount, avgRatio, avgDistance, greens, ambers, reds, sens, acc, classifiedCount: classified.length };
  }, [simResults]);

  const liveAnalysis = useMemo(() => {
    const classified = results.filter((r: PatientResult) => r.sr !== 'U');
    let perfectCount = 0;
    let totalRatio = 0;

    classified.forEach((r) => {
      const rpiN = mapTierToNumeric(r.tier);
      const manualN = mapRiskToNumeric(r.sr);
      const ratio = manualN > 0 ? rpiN / manualN : 0;
      if (Math.abs(ratio - 1.0) < 0.001) perfectCount++;
      totalRatio += ratio;
    });

    const avgRatio = classified.length > 0 ? totalRatio / classified.length : 0;

    const highs = classified.filter((r) => r.sr === 'H');
    const highRed = highs.filter((r) => r.tier === 'Red');
    const sens = highs.length ? Math.round(highRed.length / highs.length * 100) : 0;

    const expMap: Record<string, string> = { H: 'Red', M: 'Amber', L: 'Green' };
    const match = classified.filter((r) => expMap[r.sr] === r.tier).length;
    const acc = classified.length ? Math.round(match / classified.length * 100) : 0;

    return { perfectCount, avgRatio, sens, acc, classifiedCount: classified.length };
  }, [results]);

  const toggleSection = useCallback((section: ColumnSection) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const visibleColumns = useMemo(() => {
    return COLUMNS.filter((col) => !collapsedSections.has(col.section));
  }, [collapsedSections]);

  const aiData = useMemo(() => {
    const classifiedResults = results.filter((r: PatientResult) => r.sr !== 'U');

    const rows: AIPatientRow[] = classifiedResults.map((p: PatientResult) => {
      const rpiN = mapTierToNumeric(p.tier);
      const manualN = mapRiskToNumeric(p.sr);
      const ratio = manualN > 0 ? parseFloat((rpiN / manualN).toFixed(2)) : 0;
      const distance = Math.abs(ratio - 1.0);

      return {
        name: p.name,
        displayName: getDisplayName(p.name),
        age: p.age,
        gender: p.g,
        site: p.site,
        manualRisk: p.sr,
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
        startRaw: p.start,
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
        startScore: sSTarT(p),
        romScore: sROM(p, SW),
        physioScore: sPhysio(p, SW),
        anthroScore: sAnthropo(p, SW),
        comorScore: sComor(p, SW),
        lifeScore: sLife(p, SW, getLifeOverride(p.name)),
        rpiScore: p.rpi,
        rpiTier: p.tier,
        rpiNumeric: rpiN,
        manualNumeric: manualN,
        ratio,
        ratioDistance: distance,
      };
    });

    return rows;
  }, [results, SW, getLifeOverride, getDisplayName]);

  const sortedData = useMemo(() => {
    let filtered = filterSite ? aiData.filter((r) => r.site === filterSite) : aiData;

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'name') {
        const aVal = a.displayName.toLowerCase();
        const bVal = b.displayName.toLowerCase();
        return sortAsc
          ? (aVal < bVal ? -1 : aVal > bVal ? 1 : 0)
          : (aVal > bVal ? -1 : aVal < bVal ? 1 : 0);
      }
      if (sortKey === 'ratio') {
        return sortAsc ? a.ratioDistance - b.ratioDistance : b.ratioDistance - a.ratioDistance;
      }
      if (sortKey === 'age') {
        return sortAsc ? a.age - b.age : b.age - a.age;
      }
      return sortAsc ? a.rpiScore - b.rpiScore : b.rpiScore - a.rpiScore;
    });

    return sorted;
  }, [aiData, sortKey, sortAsc, filterSite]);

  const top3Indices = useMemo(() => {
    const byDistance = [...sortedData].sort((a, b) => a.ratioDistance - b.ratioDistance);
    const top3Names = new Set(byDistance.slice(0, 3).map((r) => r.name));
    return top3Names;
  }, [sortedData]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === 'ratio' ? true : false);
    }
  }, [sortKey]);

  const cycleSite = useCallback(() => {
    const vals = ['', 'KIMS', 'Kues', 'Abhis', 'SDD'];
    const idx = vals.indexOf(filterSite);
    setFilterSite(vals[(idx + 1) % vals.length]);
  }, [filterSite]);

  const totalClassified = aiData.length;
  const perfectMatch = aiData.filter((r) => r.ratio === 1.0).length;
  const avgRatio = totalClassified > 0
    ? (aiData.reduce((s, r) => s + r.ratio, 0) / totalClassified).toFixed(2)
    : '0';

  const getRankBadge = useCallback((name: string): number | null => {
    const byDistance = [...aiData].sort((a, b) => a.ratioDistance - b.ratioDistance);
    const idx = byDistance.findIndex((r) => r.name === name);
    if (idx >= 0 && idx < 3) return idx + 1;
    return null;
  }, [aiData]);

  const getRatioColor = (ratio: number, isTop3: boolean): string => {
    if (isTop3) return '#0d9488';
    if (ratio === 1.0) return '#15803d';
    if (ratio >= 0.8 && ratio <= 1.2) return '#b45309';
    return '#dc2626';
  };

  const getTierColor = (tier: 'Red' | 'Amber' | 'Green'): string => {
    if (tier === 'Red') return '#dc2626';
    if (tier === 'Amber') return '#b45309';
    return '#15803d';
  };

  const getRiskColor = (sr: string): string => {
    if (sr === 'H') return '#dc2626';
    if (sr === 'M') return '#b45309';
    if (sr === 'L') return '#15803d';
    return '#64748b';
  };

  const sections: ColumnSection[] = ['demographics', 'comorbidities', 'rom', 'start', 'physio', 'scores', 'result'];

  const renderCellValue = useCallback((col: ColDef, row: AIPatientRow, isTop3: boolean) => {
    const val = col.getValue(row);

    if (col.key === 'name') {
      const rank = getRankBadge(row.name);
      return (
        <View style={[styles.tdCell, { width: col.width }, styles.tdName]}>
          {rank && (
            <View style={styles.rankBadge}>
              <Trophy size={8} color="#fff" />
              <Text style={styles.rankText}>{rank}</Text>
            </View>
          )}
          <Text style={[styles.tdText, styles.tdNameText]} numberOfLines={1}>{val}</Text>
        </View>
      );
    }

    if (col.key === 'manual') {
      return (
        <View style={[styles.tdCell, { width: col.width }]}>
          <Text style={[styles.tdText, { color: getRiskColor(String(val)), fontWeight: '700' as const }]}>{val}</Text>
        </View>
      );
    }

    if (col.key === 'rpiScore') {
      return (
        <View style={[styles.tdCell, { width: col.width }]}>
          <View style={[styles.rpiPill, { backgroundColor: getTierColor(row.rpiTier) + '18' }]}>
            <Text style={[styles.tdTextBold, { color: getTierColor(row.rpiTier) }]}>{val}</Text>
          </View>
        </View>
      );
    }

    if (col.key === 'rpiTier') {
      return (
        <View style={[styles.tdCell, { width: col.width }]}>
          <View style={[styles.tierPill, { backgroundColor: getTierColor(row.rpiTier) + '18' }]}>
            <Text style={[styles.tdText, { color: getTierColor(row.rpiTier), fontWeight: '700' as const, fontSize: 10 }]}>{val}</Text>
          </View>
        </View>
      );
    }

    if (col.key === 'ratio') {
      const ratioColor = getRatioColor(row.ratio, isTop3);
      return (
        <View style={[styles.tdCell, { width: col.width }]}>
          <View style={[styles.ratioPill, { backgroundColor: ratioColor + '18', borderColor: ratioColor + '40' }]}>
            <Text style={[styles.ratioText, { color: ratioColor }]}>{val}</Text>
          </View>
        </View>
      );
    }

    if (col.section === 'scores') {
      const numVal = typeof val === 'number' ? val : 0;
      const scoreColor = numVal >= 60 ? '#dc2626' : numVal >= 30 ? '#b45309' : '#15803d';
      return (
        <View style={[styles.tdCell, { width: col.width }]}>
          <Text style={[styles.tdText, { color: scoreColor, fontWeight: '600' as const }]}>{val}</Text>
        </View>
      );
    }

    const numVal = typeof val === 'number' ? val : 0;
    const highlight = typeof val === 'number' && val > 0 && col.section !== 'demographics';

    return (
      <View style={[styles.tdCell, { width: col.width }]}>
        <Text style={[
          styles.tdText,
          highlight ? styles.tdHighlightText : undefined,
          numVal === 0 && col.section !== 'demographics' ? styles.tdZeroText : undefined,
        ]}>{val}</Text>
      </View>
    );
  }, [getRankBadge]);

  const domainKeys: (keyof GroupWeights)[] = ['start', 'rom', 'physio', 'anthro', 'comor', 'life'];

  const simDelta = useMemo(() => {
    return {
      perfectDelta: simAnalysis.perfectCount - liveAnalysis.perfectCount,
      ratioDelta: simAnalysis.avgRatio - liveAnalysis.avgRatio,
      sensDelta: simAnalysis.sens - liveAnalysis.sens,
      accDelta: simAnalysis.acc - liveAnalysis.acc,
    };
  }, [simAnalysis, liveAnalysis]);

  const formatDelta = (d: number, suffix?: string): string => {
    const s = suffix || '';
    if (d > 0) return `+${d}${s}`;
    if (d < 0) return `${d}${s}`;
    return `0${s}`;
  };

  const deltaColor = (d: number, invertBetter?: boolean): string => {
    const better = invertBetter ? d < 0 : d > 0;
    if (better) return '#22c55e';
    if (d === 0) return '#64748b';
    return '#ef4444';
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topBarRow}>
          <BrainCircuit size={20} color="#06b6d4" />
          <View style={styles.topBarText}>
            <Text style={styles.topTitle}>AI Analysis</Text>
            <Text style={styles.topSub}>Full Patient Data · {totalClassified} classified</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'table' && styles.tabBtnActive]}
          onPress={() => { setActiveTab('table'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <TrendingUp size={14} color={activeTab === 'table' ? '#06b6d4' : '#64748b'} />
          <Text style={[styles.tabBtnText, activeTab === 'table' && styles.tabBtnTextActive]}>Data & Ratios</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'sensitivity' && styles.tabBtnActive]}
          onPress={() => { setActiveTab('sensitivity'); setSimW({ ...W }); setSimTGA(tga); setSimTAR(tar); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Zap size={14} color={activeTab === 'sensitivity' ? '#f59e0b' : '#64748b'} />
          <Text style={[styles.tabBtnText, activeTab === 'sensitivity' && styles.tabBtnTextActive]}>Sensitivity</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'table' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {weightTotal !== 100 && (
            <View style={styles.weightWarningBanner}>
              <AlertTriangle size={14} color="#fbbf24" />
              <Text style={styles.weightWarningText}>
                Current weights total {weightTotal}% (not 100%). Scores are proportionally normalized.
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.summaryCardAccent]}>
              <Text style={styles.summaryValue}>{perfectMatch}</Text>
              <Text style={styles.summaryLabel}>Perfect Match</Text>
              <Text style={styles.summaryNote}>Ratio = 1.0</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{avgRatio}</Text>
              <Text style={styles.summaryLabel}>Avg Ratio</Text>
              <Text style={styles.summaryNote}>RPI / Manual</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{totalClassified}</Text>
              <Text style={styles.summaryLabel}>Classified</Text>
              <Text style={styles.summaryNote}>Excl. U</Text>
            </View>
          </View>

          <View style={styles.filterBar}>
            <TouchableOpacity style={[styles.filterChip, filterSite ? styles.filterChipActive : undefined]} onPress={cycleSite}>
              <Text style={[styles.filterChipText, filterSite ? styles.filterChipTextActive : undefined]}>
                {filterSite || 'All Sites'}
              </Text>
              <ChevronDown size={12} color={filterSite ? '#0d9488' : '#64748b'} />
            </TouchableOpacity>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#0d9488' }]} />
              <Text style={styles.legendText}>Top 3 closest to 1.0</Text>
            </View>
          </View>

          <View style={styles.sectionToggles}>
            <Text style={styles.sectionToggleLabel}>Columns:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionToggleRow}>
              {sections.map((sec) => {
                const isCollapsed = collapsedSections.has(sec);
                return (
                  <TouchableOpacity
                    key={sec}
                    style={[styles.sectionChip, isCollapsed ? styles.sectionChipCollapsed : undefined]}
                    onPress={() => toggleSection(sec)}
                  >
                    <Text style={[styles.sectionChipText, isCollapsed ? styles.sectionChipTextCollapsed : undefined]}>
                      {SECTION_LABELS[sec]}
                    </Text>
                    <ChevronRight
                      size={10}
                      color={isCollapsed ? '#94a3b8' : '#0e7490'}
                      style={isCollapsed ? undefined : { transform: [{ rotate: '90deg' }] }}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.tableCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                <View style={styles.sectionHeaderRow}>
                  {sections.map((sec) => {
                    if (collapsedSections.has(sec)) return null;
                    const secCols = visibleColumns.filter((c) => c.section === sec);
                    if (secCols.length === 0) return null;
                    const totalWidth = secCols.reduce((s, c) => s + c.width, 0);
                    const sectionColors: Record<ColumnSection, string> = {
                      demographics: '#1e3a5f',
                      comorbidities: '#4a1942',
                      rom: '#1a3c34',
                      start: '#3d2e0a',
                      physio: '#0a2e3d',
                      scores: '#2d1a0a',
                      result: '#164e63',
                    };
                    return (
                      <View key={sec} style={[styles.sectionHeader, { width: totalWidth, backgroundColor: sectionColors[sec] }]}>
                        <Text style={styles.sectionHeaderText}>{SECTION_LABELS[sec]}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.tableHeader}>
                  {visibleColumns.map((col) => (
                    <TouchableOpacity
                      key={col.key}
                      style={[
                        styles.thCell,
                        { width: col.width },
                        col.key === 'name' ? styles.thName : undefined,
                        col.key === 'ratio' ? styles.thRatio : undefined,
                      ]}
                      onPress={() => {
                        if (col.key === 'name') handleSort('name');
                        else if (col.key === 'age') handleSort('age');
                        else if (col.key === 'rpiScore') handleSort('rpi');
                        else if (col.key === 'ratio') handleSort('ratio');
                      }}
                    >
                      <Text style={[
                        styles.thText,
                        col.key === 'ratio' ? styles.thTextRatio : undefined,
                      ]}>{col.label}
                        {col.key === 'name' && sortKey === 'name' ? (sortAsc ? ' ↑' : ' ↓') : ''}
                        {col.key === 'age' && sortKey === 'age' ? (sortAsc ? ' ↑' : ' ↓') : ''}
                        {col.key === 'rpiScore' && sortKey === 'rpi' ? (sortAsc ? ' ↑' : ' ↓') : ''}
                        {col.key === 'ratio' && sortKey === 'ratio' ? (sortAsc ? ' ↑' : ' ↓') : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {sortedData.map((row, idx) => {
                  const isTop3 = top3Indices.has(row.name);
                  return (
                    <View
                      key={row.name}
                      style={[
                        styles.tableRow,
                        idx % 2 === 0 ? styles.tableRowEven : undefined,
                        isTop3 ? styles.tableRowHighlight : undefined,
                      ]}
                    >
                      {visibleColumns.map((col) => (
                        <React.Fragment key={col.key}>
                          {renderCellValue(col, row, isTop3)}
                        </React.Fragment>
                      ))}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Current Weights</Text>
            {weightTotal !== 100 && (
              <View style={styles.infoWarningRow}>
                <AlertTriangle size={12} color="#fbbf24" />
                <Text style={styles.infoWarningText}>Total is {weightTotal}%, not 100%</Text>
              </View>
            )}
            <Text style={styles.infoFooter}>
              STarT {W.start}% · ROM {W.rom}% · Physio {W.physio}% · Anthro {W.anthro}% · Comorbid {W.comor}% · Life {W.life}%
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>RPI/Manual Ratio</Text>
            <View style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: '#0d9488' }]} />
              <Text style={styles.infoText}><Text style={styles.infoBold}>= 1.00</Text> — Perfect concordance</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: '#b45309' }]} />
              <Text style={styles.infoText}><Text style={styles.infoBold}>0.80–1.20</Text> — Near match</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: '#dc2626' }]} />
              <Text style={styles.infoText}><Text style={styles.infoBold}>{'<'}0.80 or {'>'}1.20</Text> — Significant discordance</Text>
            </View>
            <Text style={styles.infoFooter}>
              Mapping: High/Red=3, Moderate/Amber=2, Low/Green=1
            </Text>
          </View>
        </ScrollView>
      )}

      {activeTab === 'sensitivity' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sensHeaderCard}>
            <View style={styles.sensHeaderRow}>
              <Zap size={18} color="#f59e0b" />
              <Text style={styles.sensHeaderTitle}>Dynamic Sensitivity Analysis</Text>
            </View>
            <Text style={styles.sensHeaderSub}>
              Adjust weights below to simulate how different configurations affect RPI/Manual concordance in real-time.
            </Text>
          </View>

          {simTotal !== 100 && (
            <View style={styles.simWarningBanner}>
              <AlertTriangle size={14} color="#fbbf24" />
              <Text style={styles.simWarningText}>
                Simulation weights total {simTotal}% — not 100%. Results will be proportionally normalized.
              </Text>
            </View>
          )}

          <View style={styles.simWeightsCard}>
            <View style={styles.simWeightsHeader}>
              <Text style={styles.simWeightsTitle}>WEIGHT CONFIGURATION</Text>
              <View style={styles.simWeightsHeaderRight}>
                <View style={[styles.simTotalBadge, { borderColor: simTotal === 100 ? '#166534' : '#991b1b' }]}>
                  <Text style={[styles.simTotalText, { color: simTotal === 100 ? '#4ade80' : '#f87171' }]}>
                    Σ {simTotal}%
                  </Text>
                </View>
                <TouchableOpacity style={styles.resetBtn} onPress={resetSimToLive}>
                  <RotateCcw size={12} color="#60a5fa" />
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            {domainKeys.map((dk) => {
              const color = DOMAIN_COLORS[dk];
              const label = DOMAIN_LABELS[dk];
              return (
                <View key={dk} style={styles.simDomainRow}>
                  <View style={[styles.simDomainDot, { backgroundColor: color }]} />
                  <Text style={[styles.simDomainLabel, { color }]}>{label}</Text>
                  <View style={styles.simSliderWrap}>
                    <Slider
                      value={simW[dk]}
                      min={0}
                      max={100}
                      onValueChange={(v) => handleSimWeightChange(dk, v)}
                      trackColor={color}
                    />
                  </View>
                  <Text style={[styles.simDomainValue, { color }]}>{simW[dk]}%</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.simCompareCard}>
            <Text style={styles.simCompareTitle}>LIVE vs SIMULATION COMPARISON</Text>

            <View style={styles.simCompareGrid}>
              <View style={styles.simCompareColHeader}>
                <Text style={styles.simCompareColLabel}></Text>
                <Text style={styles.simCompareColLive}>Live</Text>
                <Text style={styles.simCompareColSim}>Sim</Text>
                <Text style={styles.simCompareColDelta}>Δ</Text>
              </View>

              <View style={styles.simCompareRow}>
                <Text style={styles.simCompareMetric}>Perfect Match</Text>
                <Text style={styles.simCompareLiveVal}>{liveAnalysis.perfectCount}</Text>
                <Text style={styles.simCompareSimVal}>{simAnalysis.perfectCount}</Text>
                <Text style={[styles.simCompareDeltaVal, { color: deltaColor(simDelta.perfectDelta) }]}>
                  {formatDelta(simDelta.perfectDelta)}
                </Text>
              </View>

              <View style={styles.simCompareRow}>
                <Text style={styles.simCompareMetric}>Avg Ratio</Text>
                <Text style={styles.simCompareLiveVal}>{liveAnalysis.avgRatio.toFixed(2)}</Text>
                <Text style={styles.simCompareSimVal}>{simAnalysis.avgRatio.toFixed(2)}</Text>
                <Text style={[styles.simCompareDeltaVal, { color: deltaColor(-Math.abs(simDelta.ratioDelta)) }]}>
                  {simDelta.ratioDelta >= 0 ? '+' : ''}{simDelta.ratioDelta.toFixed(2)}
                </Text>
              </View>

              <View style={styles.simCompareRow}>
                <Text style={styles.simCompareMetric}>Sensitivity</Text>
                <Text style={styles.simCompareLiveVal}>{liveAnalysis.sens}%</Text>
                <Text style={styles.simCompareSimVal}>{simAnalysis.sens}%</Text>
                <Text style={[styles.simCompareDeltaVal, { color: deltaColor(simDelta.sensDelta) }]}>
                  {formatDelta(simDelta.sensDelta, '%')}
                </Text>
              </View>

              <View style={styles.simCompareRow}>
                <Text style={styles.simCompareMetric}>Accuracy</Text>
                <Text style={styles.simCompareLiveVal}>{liveAnalysis.acc}%</Text>
                <Text style={styles.simCompareSimVal}>{simAnalysis.acc}%</Text>
                <Text style={[styles.simCompareDeltaVal, { color: deltaColor(simDelta.accDelta) }]}>
                  {formatDelta(simDelta.accDelta, '%')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.simDistCard}>
            <Text style={styles.simDistTitle}>TIER DISTRIBUTION (Simulated)</Text>
            <View style={styles.simDistRow}>
              <View style={[styles.simDistItem, { backgroundColor: '#052e16', borderColor: '#166534' }]}>
                <Text style={[styles.simDistVal, { color: '#4ade80' }]}>{simAnalysis.greens}</Text>
                <Text style={[styles.simDistLabel, { color: '#22c55e' }]}>Green</Text>
              </View>
              <View style={[styles.simDistItem, { backgroundColor: '#422006', borderColor: '#854d0e' }]}>
                <Text style={[styles.simDistVal, { color: '#fbbf24' }]}>{simAnalysis.ambers}</Text>
                <Text style={[styles.simDistLabel, { color: '#f59e0b' }]}>Amber</Text>
              </View>
              <View style={[styles.simDistItem, { backgroundColor: '#450a0a', borderColor: '#991b1b' }]}>
                <Text style={[styles.simDistVal, { color: '#f87171' }]}>{simAnalysis.reds}</Text>
                <Text style={[styles.simDistLabel, { color: '#ef4444' }]}>Red</Text>
              </View>
            </View>

            <View style={styles.simDistBarContainer}>
              {simAnalysis.classifiedCount > 0 && (
                <View style={styles.simDistBar}>
                  <View style={[styles.simDistBarSeg, { flex: simAnalysis.greens || 0.01, backgroundColor: '#22c55e' }]} />
                  <View style={[styles.simDistBarSeg, { flex: simAnalysis.ambers || 0.01, backgroundColor: '#f59e0b' }]} />
                  <View style={[styles.simDistBarSeg, { flex: simAnalysis.reds || 0.01, backgroundColor: '#ef4444' }]} />
                </View>
              )}
            </View>
          </View>

          <View style={styles.simWeightVsLiveCard}>
            <Text style={styles.simWeightVsLiveTitle}>WEIGHT COMPARISON</Text>
            {domainKeys.map((dk) => {
              const color = DOMAIN_COLORS[dk];
              const label = DOMAIN_LABELS[dk];
              const live = W[dk];
              const sim = simW[dk];
              const diff = sim - live;
              return (
                <View key={dk} style={styles.simWeightCompRow}>
                  <View style={[styles.simCompDot, { backgroundColor: color }]} />
                  <Text style={styles.simCompLabel}>{label}</Text>
                  <Text style={styles.simCompLive}>{live}%</Text>
                  <Text style={styles.simCompArrow}>→</Text>
                  <Text style={[styles.simCompSim, { color }]}>{sim}%</Text>
                  <Text style={[styles.simCompDiff, { color: diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : '#64748b' }]}>
                    {diff > 0 ? `+${diff}` : diff === 0 ? '—' : String(diff)}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How Sensitivity Works</Text>
            <Text style={styles.infoFooter}>
              Adjust each domain weight independently. The system recalculates RPI for all patients using your simulated weights. Compare metrics vs live configuration to find the optimal weight distribution that brings RPI/Manual ratio closest to 1.0.
            </Text>
            {simTotal !== 100 && (
              <Text style={[styles.infoFooter, { color: '#fbbf24', marginTop: 6 }]}>
                Note: When weights don't sum to 100%, the RPI formula normalizes proportionally — each weight's effective contribution = weight / total.
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a1020',
    borderBottomWidth: 2,
    borderBottomColor: '#0e7490',
  },
  topBarRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  topBarText: {
    flex: 1,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: '#ecfeff',
  },
  topSub: {
    fontSize: 12,
    color: '#67e8f9',
    marginTop: 2,
  },
  tabSwitcher: {
    flexDirection: 'row' as const,
    backgroundColor: '#0a1020',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    paddingHorizontal: 12,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#06b6d4',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ecfeff',
  },
  scroll: {
    flex: 1,
  },
  weightWarningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: '#fef9c3',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  weightWarningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#854d0e',
    lineHeight: 16,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
  },
  summaryCardAccent: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: '#0f172a',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  summaryNote: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  filterBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#0d9488',
  },
  legendRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600' as const,
  },
  sectionToggles: {
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  sectionToggleLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  sectionToggleRow: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  sectionChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#67e8f9',
    borderRadius: 12,
  },
  sectionChipCollapsed: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  sectionChipText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#0e7490',
  },
  sectionChipTextCollapsed: {
    color: '#94a3b8',
  },
  tableCard: {
    marginHorizontal: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
  },
  sectionHeader: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  sectionHeaderText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: 'row' as const,
    backgroundColor: '#0f172a',
  },
  thCell: {
    paddingVertical: 8,
    paddingHorizontal: 3,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  thName: {
    alignItems: 'flex-start' as const,
    paddingLeft: 8,
  },
  thRatio: {
    backgroundColor: '#164e63',
  },
  thText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.2,
    textAlign: 'center' as const,
  },
  thTextRatio: {
    color: '#67e8f9',
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  tableRowHighlight: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 3,
    borderLeftColor: '#0d9488',
  },
  tdCell: {
    paddingVertical: 7,
    paddingHorizontal: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  tdName: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingLeft: 6,
  },
  tdText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#334155',
    textAlign: 'center' as const,
  },
  tdTextBold: {
    fontSize: 11,
    fontWeight: '800' as const,
  },
  tdNameText: {
    fontWeight: '600' as const,
    color: '#1e293b',
    fontSize: 11,
    textAlign: 'left' as const,
  },
  tdHighlightText: {
    color: '#0f172a',
    fontWeight: '700' as const,
  },
  tdZeroText: {
    color: '#cbd5e1',
  },
  rpiPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tierPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  ratioPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  ratioText: {
    fontSize: 11,
    fontWeight: '900' as const,
  },
  rankBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
    backgroundColor: '#0d9488',
    borderRadius: 5,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  rankText: {
    fontSize: 8,
    fontWeight: '900' as const,
    color: '#fff',
  },
  infoCard: {
    marginHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#334155',
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    marginBottom: 6,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '800' as const,
    color: '#1e293b',
  },
  infoFooter: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 17,
    marginTop: 4,
  },
  infoWarningRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
    backgroundColor: '#fef9c3',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  infoWarningText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#854d0e',
  },
  sensHeaderCard: {
    marginHorizontal: 12,
    backgroundColor: '#1a0f00',
    borderWidth: 1,
    borderColor: '#854d0e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  sensHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  sensHeaderTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: '#fbbf24',
  },
  sensHeaderSub: {
    fontSize: 12,
    color: '#d97706',
    lineHeight: 18,
  },
  simWarningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: '#422006',
    borderWidth: 1,
    borderColor: '#854d0e',
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  simWarningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fbbf24',
    lineHeight: 16,
  },
  simWeightsCard: {
    marginHorizontal: 12,
    backgroundColor: '#0a1228',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 12,
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  simWeightsHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  simWeightsTitle: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  simWeightsHeaderRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  simTotalBadge: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  simTotalText: {
    fontSize: 12,
    fontWeight: '900' as const,
  },
  resetBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#2d5f9e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#60a5fa',
  },
  simDomainRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  simDomainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  simDomainLabel: {
    width: 64,
    fontSize: 11,
    fontWeight: '800' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  simSliderWrap: {
    flex: 1,
    minWidth: 80,
  },
  simDomainValue: {
    width: 36,
    textAlign: 'right' as const,
    fontSize: 14,
    fontWeight: '900' as const,
  },
  simCompareCard: {
    marginHorizontal: 12,
    backgroundColor: '#0a1228',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 12,
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  simCompareTitle: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  simCompareGrid: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  simCompareColHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    marginBottom: 4,
  },
  simCompareColLabel: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#475569',
    textTransform: 'uppercase' as const,
  },
  simCompareColLive: {
    width: 52,
    textAlign: 'center' as const,
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#60a5fa',
    textTransform: 'uppercase' as const,
  },
  simCompareColSim: {
    width: 52,
    textAlign: 'center' as const,
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#f59e0b',
    textTransform: 'uppercase' as const,
  },
  simCompareColDelta: {
    width: 52,
    textAlign: 'center' as const,
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
  },
  simCompareRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,58,95,0.4)',
  },
  simCompareMetric: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#e2e8f0',
  },
  simCompareLiveVal: {
    width: 52,
    textAlign: 'center' as const,
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#93c5fd',
  },
  simCompareSimVal: {
    width: 52,
    textAlign: 'center' as const,
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#fbbf24',
  },
  simCompareDeltaVal: {
    width: 52,
    textAlign: 'center' as const,
    fontSize: 13,
    fontWeight: '900' as const,
  },
  simDistCard: {
    marginHorizontal: 12,
    backgroundColor: '#0a1228',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  simDistTitle: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  simDistRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 10,
  },
  simDistItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center' as const,
  },
  simDistVal: {
    fontSize: 22,
    fontWeight: '900' as const,
  },
  simDistLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  simDistBarContainer: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden' as const,
    backgroundColor: '#1e3a5f',
  },
  simDistBar: {
    flex: 1,
    flexDirection: 'row' as const,
    borderRadius: 5,
    overflow: 'hidden' as const,
  },
  simDistBarSeg: {
    height: 10,
  },
  simWeightVsLiveCard: {
    marginHorizontal: 12,
    backgroundColor: '#0a1228',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  simWeightVsLiveTitle: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  simWeightCompRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 5,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,58,95,0.3)',
  },
  simCompDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  simCompLabel: {
    width: 64,
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#94a3b8',
  },
  simCompLive: {
    width: 38,
    textAlign: 'right' as const,
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#93c5fd',
  },
  simCompArrow: {
    fontSize: 12,
    color: '#475569',
    marginHorizontal: 2,
  },
  simCompSim: {
    width: 38,
    fontSize: 12,
    fontWeight: '900' as const,
  },
  simCompDiff: {
    flex: 1,
    textAlign: 'right' as const,
    fontSize: 12,
    fontWeight: '800' as const,
  },
});
