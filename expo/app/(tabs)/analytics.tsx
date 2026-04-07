import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useRPI } from '@/contexts/RPIContext';
import Colors from '@/constants/colors';
import { fonts } from '@/constants/theme';
import { DEFAULT_SUB_WEIGHTS, computeStats, sComor, sLife, sPhysio, sROM, sSTarT } from '@/data/scoring';
import { PatientRaw, PatientResult } from '@/data/types';

type DemographicKey = 'gender' | 'age' | 'bmi' | 'waist' | 'height' | 'weight';
type ClinicalKey = 'rpi' | 'start' | 'romFlexion' | 'romExtension' | 'romLeft' | 'romRight' | 'physio' | 'comor' | 'life' | 'tierDistribution' | 'sensitivity' | 'accuracy';

type EnrichedPatient = {
  patient: PatientRaw;
  result: PatientResult | null;
  bmi: number | null;
  height: number | null;
  weight: number | null;
  waist: number | null;
  rpi: number | null;
  tier: 'Red' | 'Amber' | 'Green' | null;
  start: number;
  rom: number;
  physio: number;
  comor: number;
  life: number;
};

type ChartState = {
  demographics: DemographicKey[];
  clinical: ClinicalKey[];
  subgroupFilters: Partial<Record<DemographicKey, string[]>>;
};

type SingleMetricRow = {
  label: string;
  value: number;
  count: number;
};

type TierDistributionRow = {
  label: string;
  green: number;
  amber: number;
  red: number;
  count: number;
};

type HeatmapCell = {
  rowLabel: string;
  columnLabel: string;
  value: number;
  count: number;
};

type GroupedMetricRow = {
  label: string;
  count: number;
  values: Record<string, number>;
};

type AnalysisResult =
  | { type: 'horizontal'; title: string; excluded: number; filteredOut: number; rows: SingleMetricRow[]; chartWidth: number; color: string }
  | { type: 'grouped'; title: string; excluded: number; filteredOut: number; groups: GroupedMetricRow[]; metrics: ClinicalKey[]; chartWidth: number }
  | { type: 'stacked'; title: string; excluded: number; filteredOut: number; rows: TierDistributionRow[]; chartWidth: number }
  | { type: 'heatmap'; title: string; excluded: number; filteredOut: number; rowLabels: string[]; columnLabels: string[]; cells: HeatmapCell[] };

const CHART_COLORS = ['#1E40AF', '#7C3AED', '#0891B2'];
const CLINICAL_COLORS: Record<ClinicalKey, string> = {
  rpi: '#1E40AF',
  start: '#7C3AED',
  romFlexion: '#0891B2',
  romExtension: '#0F766E',
  romLeft: '#D97706',
  romRight: '#9333EA',
  physio: '#D97706',
  comor: '#DC2626',
  life: '#059669',
  sensitivity: '#DC2626',
  accuracy: '#1E40AF',
  tierDistribution: '#1E40AF',
};

const DEMOGRAPHIC_OPTIONS: Array<{ key: DemographicKey; label: string; title: string }> = [
  { key: 'gender', label: 'Gender (M/F groups)', title: 'Gender' },
  { key: 'age', label: 'Age (bands: 20-30, 30-40, 40-50, 50-60, 60+)', title: 'Age Group' },
  { key: 'bmi', label: 'BMI (bands: Under 18.5, 18.5-25, 25-30, 30-35, 35+)', title: 'BMI' },
  { key: 'waist', label: 'Waist (bands: Under 80cm, 80-90cm, 90-100cm, 100cm+)', title: 'Waist' },
  { key: 'height', label: 'Height (bands: Under 155cm, 155-165cm, 165-175cm, 175cm+)', title: 'Height' },
  { key: 'weight', label: 'Weight (bands: Under 60kg, 60-75kg, 75-90kg, 90kg+)', title: 'Weight' },
];

const CLINICAL_OPTIONS: Array<{ key: ClinicalKey; label: string; title: string }> = [
  { key: 'rpi', label: 'RPI Score (average)', title: 'Average RPI' },
  { key: 'start', label: 'STarT Score (average)', title: 'Average STarT Score' },
  { key: 'romFlexion', label: 'ROM Flexion', title: 'Average Flexion Angle' },
  { key: 'romExtension', label: 'ROM Extension', title: 'Average Extension Angle' },
  { key: 'romLeft', label: 'ROM Left Rotation', title: 'Average Left Rotation Angle' },
  { key: 'romRight', label: 'ROM Right Rotation', title: 'Average Right Rotation Angle' },
  { key: 'physio', label: 'Physio Score (average)', title: 'Average Physio Score' },
  { key: 'comor', label: 'Comorbidity Score (average)', title: 'Average Comorbidity Score' },
  { key: 'life', label: 'Lifestyle Score (average)', title: 'Average Lifestyle Score' },
  { key: 'tierDistribution', label: 'Tier Distribution (% Green/Amber/Red)', title: 'Tier Distribution' },
  { key: 'sensitivity', label: 'Sensitivity', title: 'Sensitivity' },
  { key: 'accuracy', label: 'Accuracy', title: 'Accuracy' },
];

function getDemographicTitle(key: DemographicKey): string {
  return DEMOGRAPHIC_OPTIONS.find((option) => option.key === key)?.title || key;
}

function getClinicalTitle(key: ClinicalKey): string {
  return CLINICAL_OPTIONS.find((option) => option.key === key)?.title || key;
}

function getBandValue(key: DemographicKey, row: EnrichedPatient): string | null {
  if (key === 'gender') return row.patient.g === 'F' ? 'Female' : 'Male';
  if (key === 'age') {
    const age = row.patient.age;
    if (age < 30) return '20-30';
    if (age < 40) return '30-40';
    if (age < 50) return '40-50';
    if (age < 60) return '50-60';
    return '60+';
  }
  if (key === 'bmi') {
    if (row.bmi == null) return null;
    if (row.bmi < 18.5) return 'Under 18.5';
    if (row.bmi < 25) return '18.5-25';
    if (row.bmi < 30) return '25-30';
    if (row.bmi < 35) return '30-35';
    return '35+';
  }
  if (key === 'waist') {
    if (row.waist == null) return null;
    if (row.waist < 80) return 'Under 80cm';
    if (row.waist < 90) return '80-90cm';
    if (row.waist < 100) return '90-100cm';
    return '100cm+';
  }
  if (key === 'height') {
    if (row.height == null) return null;
    if (row.height < 155) return 'Under 155cm';
    if (row.height < 165) return '155-165cm';
    if (row.height < 175) return '165-175cm';
    return '175cm+';
  }
  if (row.weight == null) return null;
  if (row.weight < 60) return 'Under 60kg';
  if (row.weight < 75) return '60-75kg';
  if (row.weight < 90) return '75-90kg';
  return '90kg+';
}

function getDemographicOrder(key: DemographicKey): string[] {
  if (key === 'gender') return ['Female', 'Male'];
  if (key === 'age') return ['20-30', '30-40', '40-50', '50-60', '60+'];
  if (key === 'bmi') return ['Under 18.5', '18.5-25', '25-30', '30-35', '35+'];
  if (key === 'waist') return ['Under 80cm', '80-90cm', '90-100cm', '100cm+'];
  if (key === 'height') return ['Under 155cm', '155-165cm', '165-175cm', '175cm+'];
  return ['Under 60kg', '60-75kg', '75-90kg', '90kg+'];
}

function getAverageMetricValue(key: ClinicalKey, row: EnrichedPatient): number | null {
  if (key === 'rpi') return row.rpi;
  if (key === 'start') return row.start;
  if (key === 'romFlexion') return row.patient.flex;
  if (key === 'romExtension') return row.patient.ext;
  if (key === 'romLeft') return row.patient.lrot;
  if (key === 'romRight') return row.patient.rrot;
  if (key === 'physio') return row.physio;
  if (key === 'comor') return row.comor;
  if (key === 'life') return row.life;
  return null;
}

function getSelectedBands(
  key: DemographicKey,
  subgroupFilters: Partial<Record<DemographicKey, string[]>>,
): string[] {
  const selected = subgroupFilters[key];
  if (!selected || selected.length === 0) return getDemographicOrder(key);
  return getDemographicOrder(key).filter((band) => selected.includes(band));
}

function getAnalysisExplanation(analysis: AnalysisResult | null): string | null {
  if (!analysis) return null;

  if (analysis.type === 'horizontal') {
    if (analysis.rows.length === 0) return 'No matching patients were available for the selected subgroup filters, so there is nothing to compare.';
    const sorted = [...analysis.rows].sort((a, b) => b.value - a.value);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    return `${highest.label} has the highest ${analysis.title.toLowerCase()} at ${Math.round(highest.value)}, while ${lowest.label} is lowest at ${Math.round(lowest.value)}. This is a direct subgroup comparison for the selected clinical measure.`;
  }

  if (analysis.type === 'grouped') {
    if (analysis.groups.length === 0) return 'No matching patients were available for the selected subgroup filters, so there is nothing to compare.';
    const summary = analysis.metrics.map((metric) => {
      const ranked = [...analysis.groups]
        .map((group) => ({ label: group.label, value: group.values[metric] || 0 }))
        .sort((a, b) => b.value - a.value);
      return `${getClinicalTitle(metric)} is highest in ${ranked[0].label}`;
    }).join('. ');
    return `${summary}. Use this chart to compare how multiple clinical measures move across the same demographic subgroups.`;
  }

  if (analysis.type === 'stacked') {
    if (analysis.rows.length === 0) return 'No matching patients were available for the selected subgroup filters, so there is nothing to compare.';
    const redLeader = [...analysis.rows].sort((a, b) => b.red - a.red)[0];
    const greenLeader = [...analysis.rows].sort((a, b) => b.green - a.green)[0];
    return `${redLeader.label} has the highest red-tier share, while ${greenLeader.label} has the strongest green-tier share. This chart shows how tier mix changes across the selected demographic subgroups rather than just average score.`;
  }

  if (analysis.cells.length === 0) return 'No matching patients were available for the selected subgroup filters, so there is nothing to compare.';
  const hottest = [...analysis.cells].sort((a, b) => b.value - a.value)[0];
  const coolest = [...analysis.cells].sort((a, b) => a.value - b.value)[0];
  return `${hottest.rowLabel} × ${hottest.columnLabel} has the highest value at ${Math.round(hottest.value)}, while ${coolest.rowLabel} × ${coolest.columnLabel} is lowest at ${Math.round(coolest.value)}. This heatmap highlights where combinations of two demographic subgroup filters concentrate higher or lower clinical values.`;
}

function SelectionChip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.selectorChip,
        selected ? styles.selectorChipSelected : styles.selectorChipIdle,
        disabled && styles.selectorChipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[styles.selectorChipText, selected && styles.selectorChipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function HorizontalBarChart({ rows, width, color }: { rows: SingleMetricRow[]; width: number; color: string }) {
  const leftLabelWidth = 124;
  const chartWidth = Math.max(160, width - leftLabelWidth - 30);
  const rowHeight = 40;
  const height = rows.length * rowHeight + 16;
  return (
    <Svg width={width} height={height}>
      {rows.map((row, index) => {
        const y = 10 + index * rowHeight;
        const barWidth = Math.max(2, (row.value / 100) * chartWidth);
        return (
          <React.Fragment key={row.label}>
            <SvgText x={0} y={y + 14} fontSize={12} fontWeight="600" fill="#334155">{row.label}</SvgText>
            <SvgText x={0} y={y + 28} fontSize={10} fill="#64748b">n={row.count}</SvgText>
            <Rect x={leftLabelWidth} y={y} width={chartWidth} height={18} rx={9} fill="#e2e8f0" />
            <Rect x={leftLabelWidth} y={y} width={barWidth} height={18} rx={9} fill={color} />
            <SvgText x={leftLabelWidth + chartWidth - 38} y={y + 13} fontSize={11} fontWeight="700" fill="#0f172a">{Math.round(row.value)}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function GroupedBarChart({ groups, metrics, width }: { groups: GroupedMetricRow[]; metrics: ClinicalKey[]; width: number }) {
  const chartHeight = 260;
  const leftPad = 36;
  const bottomPad = 56;
  const topPad = 16;
  const innerWidth = width - leftPad - 12;
  const innerHeight = chartHeight - topPad - bottomPad;
  const groupWidth = innerWidth / Math.max(groups.length, 1);
  const barGap = 4;
  const barWidth = Math.max(10, (groupWidth - 14 - barGap * Math.max(0, metrics.length - 1)) / Math.max(metrics.length, 1));
  return (
    <View>
      <Svg width={width} height={chartHeight}>
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = topPad + innerHeight - (tick / 100) * innerHeight;
          return (
            <React.Fragment key={tick}>
              <Line x1={leftPad} y1={y} x2={width - 8} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <SvgText x={0} y={y + 4} fontSize={10} fill="#64748b">{tick}</SvgText>
            </React.Fragment>
          );
        })}
        {groups.map((group, groupIndex) => {
          const groupX = leftPad + groupIndex * groupWidth + 8;
          return (
            <React.Fragment key={group.label}>
              {metrics.map((metric, metricIndex) => {
                const value = group.values[metric] || 0;
                const barHeight = (value / 100) * innerHeight;
                const x = groupX + metricIndex * (barWidth + barGap);
                const y = topPad + innerHeight - barHeight;
                return <Rect key={metric} x={x} y={y} width={barWidth} height={barHeight} rx={4} fill={CHART_COLORS[metricIndex]} />;
              })}
              <SvgText x={groupX} y={chartHeight - 24} fontSize={10} fill="#334155">{group.label}</SvgText>
              <SvgText x={groupX} y={chartHeight - 10} fontSize={9} fill="#64748b">n={group.count}</SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.legendRowWrap}>
        {metrics.map((metric, index) => (
          <View key={metric} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: CHART_COLORS[index] }]} />
            <Text style={styles.legendItemText}>{getClinicalTitle(metric)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StackedTierChart({ rows, width }: { rows: TierDistributionRow[]; width: number }) {
  return (
    <View style={styles.stackedWrap}>
      {rows.map((row) => (
        <View key={row.label} style={styles.stackedRow}>
          <View style={styles.stackedHead}>
            <Text style={styles.stackedLabel}>{row.label}</Text>
            <Text style={styles.stackedCount}>n={row.count}</Text>
          </View>
          <View style={[styles.stackedTrack, { width }]}>
            <View style={[styles.stackedSegment, { width: `${row.green}%`, backgroundColor: '#059669' }]} />
            <View style={[styles.stackedSegment, { width: `${row.amber}%`, backgroundColor: '#D97706' }]} />
            <View style={[styles.stackedSegment, { width: `${row.red}%`, backgroundColor: '#DC2626' }]} />
          </View>
          <Text style={styles.stackedMeta}>G {Math.round(row.green)}% · A {Math.round(row.amber)}% · R {Math.round(row.red)}%</Text>
        </View>
      ))}
      <View style={styles.legendRowWrap}>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#059669' }]} /><Text style={styles.legendItemText}>Green</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#D97706' }]} /><Text style={styles.legendItemText}>Amber</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#DC2626' }]} /><Text style={styles.legendItemText}>Red</Text></View>
      </View>
    </View>
  );
}

function HeatmapChart({ rows, columns, cells }: { rows: string[]; columns: string[]; cells: HeatmapCell[] }) {
  const maxValue = Math.max(1, ...cells.map((cell) => cell.value));
  return (
    <View style={styles.heatmapWrap}>
      <View style={styles.heatmapHeaderRow}>
        <View style={styles.heatmapCorner} />
        {columns.map((column) => (
          <Text key={column} style={styles.heatmapHeaderText}>{column}</Text>
        ))}
      </View>
      {rows.map((rowLabel) => (
        <View key={rowLabel} style={styles.heatmapRow}>
          <Text style={styles.heatmapRowLabel}>{rowLabel}</Text>
          {columns.map((columnLabel) => {
            const cell = cells.find((entry) => entry.rowLabel === rowLabel && entry.columnLabel === columnLabel);
            const value = cell?.value || 0;
            const intensity = value / maxValue;
            const bg = `rgba(30, 64, 175, ${0.12 + intensity * 0.78})`;
            return (
              <View key={`${rowLabel}-${columnLabel}`} style={[styles.heatmapCell, { backgroundColor: bg }]}>
                <Text style={styles.heatmapValue}>{Math.round(value)}</Text>
                <Text style={styles.heatmapCount}>n={cell?.count || 0}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function AnalyticsExplorerScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { patients, results, lifeOverrides } = useRPI();
  const [selectedDemographics, setSelectedDemographics] = useState<DemographicKey[]>([]);
  const [selectedClinical, setSelectedClinical] = useState<ClinicalKey[]>([]);
  const [subgroupFilters, setSubgroupFilters] = useState<Partial<Record<DemographicKey, string[]>>>({});
  const [generatedChart, setGeneratedChart] = useState<ChartState | null>(null);

  const resultMap = useMemo(() => new Map(results.map((item) => [item.name, item])), [results]);

  const enrichedPatients = useMemo<EnrichedPatient[]>(() => {
    return patients.map((patient) => {
      const result = resultMap.get(patient.name) || null;
      const derivedBmi = patient.bmi != null
        ? patient.bmi
        : patient.height && patient.weight
          ? patient.weight / Math.pow(patient.height / 100, 2)
          : null;
      return {
        patient,
        result,
        bmi: derivedBmi == null ? null : Math.round(derivedBmi * 10) / 10,
        height: patient.height,
        weight: patient.weight,
        waist: patient.waistLength,
        rpi: result?.rpi ?? null,
        tier: result?.tier ?? null,
        start: sSTarT(patient),
        rom: sROM(patient, DEFAULT_SUB_WEIGHTS),
        physio: sPhysio(patient, DEFAULT_SUB_WEIGHTS),
        comor: sComor(patient, DEFAULT_SUB_WEIGHTS),
        life: sLife(patient, DEFAULT_SUB_WEIGHTS, lifeOverrides[patient.name]),
      };
    });
  }, [patients, resultMap, lifeOverrides]);

  const minimumMet = selectedDemographics.length >= 1 && selectedClinical.length >= 1;
  const allDemographicsHaveSubgroups = selectedDemographics.every((key) => getSelectedBands(key, subgroupFilters).length > 0);
  const includesTierDistribution = selectedClinical.includes('tierDistribution');
  const combinationSupported = minimumMet && allDemographicsHaveSubgroups && (
    (selectedDemographics.length === 1 && !includesTierDistribution && selectedClinical.length <= 3) ||
    (selectedDemographics.length === 1 && includesTierDistribution && selectedClinical.length === 1) ||
    (selectedDemographics.length === 2 && selectedClinical.length === 1 && !includesTierDistribution)
  );

  const analysis = useMemo<AnalysisResult | null>(() => {
    if (!generatedChart) return null;

    const demoKeys = generatedChart.demographics;
    const clinicalKeys = generatedChart.clinical;
    const activeSubgroups = generatedChart.subgroupFilters;
    const chartWidth = Math.min(width - 56, 980);
    const excluded = { count: 0 };
    const filteredOut = { count: 0 };

    const filtered = enrichedPatients.filter((row) => {
      const hasMissingDemo = demoKeys.some((key) => getBandValue(key, row) === null);
      if (hasMissingDemo) {
        excluded.count += 1;
        return false;
      }
      const insideSelectedSubgroups = demoKeys.every((key) => {
        const band = getBandValue(key, row);
        return band != null && getSelectedBands(key, activeSubgroups).includes(band);
      });
      if (!insideSelectedSubgroups) {
        filteredOut.count += 1;
        return false;
      }
      return true;
    });

    if (demoKeys.length === 1 && clinicalKeys.length === 1 && clinicalKeys[0] === 'tierDistribution') {
      const demoKey = demoKeys[0];
      const rows = getSelectedBands(demoKey, activeSubgroups).map((band) => {
        const members = filtered.filter((row) => getBandValue(demoKey, row) === band && row.tier);
        const count = members.length;
        const green = count ? (members.filter((row) => row.tier === 'Green').length / count) * 100 : 0;
        const amber = count ? (members.filter((row) => row.tier === 'Amber').length / count) * 100 : 0;
        const red = count ? (members.filter((row) => row.tier === 'Red').length / count) * 100 : 0;
        return { label: band, count, green, amber, red };
      }).filter((row) => row.count > 0);
      return {
        type: 'stacked',
        title: `${getClinicalTitle('tierDistribution')} by ${getDemographicTitle(demoKey)}`,
        excluded: excluded.count,
        filteredOut: filteredOut.count,
        rows,
        chartWidth,
      };
    }

    if (demoKeys.length === 2 && clinicalKeys.length === 1) {
      const [demoA, demoB] = demoKeys;
      const metric = clinicalKeys[0];
      const rowLabels = getSelectedBands(demoA, activeSubgroups);
      const columnLabels = getSelectedBands(demoB, activeSubgroups);
      const cells: HeatmapCell[] = [];

      rowLabels.forEach((rowLabel) => {
        columnLabels.forEach((columnLabel) => {
          const members = filtered.filter((row) => getBandValue(demoA, row) === rowLabel && getBandValue(demoB, row) === columnLabel);
          if (members.length === 0) return;
          let value = 0;
          if (metric === 'sensitivity' || metric === 'accuracy') {
            const stats = computeStats(members.map((row) => row.result).filter(Boolean) as PatientResult[]);
            value = metric === 'sensitivity' ? stats.sens : stats.acc;
          } else {
            const values = members.map((row) => getAverageMetricValue(metric, row)).filter((entry): entry is number => entry != null);
            value = values.length ? values.reduce((sum, entry) => sum + entry, 0) / values.length : 0;
          }
          cells.push({ rowLabel, columnLabel, value, count: members.length });
        });
      });

      return {
        type: 'heatmap',
        title: `${getClinicalTitle(metric)} by ${getDemographicTitle(demoA)} and ${getDemographicTitle(demoB)}`,
        excluded: excluded.count,
        filteredOut: filteredOut.count,
        rowLabels: rowLabels.filter((label) => cells.some((cell) => cell.rowLabel === label)),
        columnLabels: columnLabels.filter((label) => cells.some((cell) => cell.columnLabel === label)),
        cells,
      };
    }

    const demoKey = demoKeys[0];
  const bandOrder = getSelectedBands(demoKey, activeSubgroups);
    const grouped = bandOrder.map((band) => {
      const members = filtered.filter((row) => getBandValue(demoKey, row) === band);
      if (members.length === 0) return null;
      if (clinicalKeys.length === 1) {
        const metric = clinicalKeys[0];
        let value = 0;
        if (metric === 'sensitivity' || metric === 'accuracy') {
          const stats = computeStats(members.map((row) => row.result).filter(Boolean) as PatientResult[]);
          value = metric === 'sensitivity' ? stats.sens : stats.acc;
        } else {
          const values = members.map((row) => getAverageMetricValue(metric, row)).filter((entry): entry is number => entry != null);
          value = values.length ? values.reduce((sum, entry) => sum + entry, 0) / values.length : 0;
        }
        return { label: band, count: members.length, value };
      }

      const values = clinicalKeys.reduce<Record<string, number>>((acc, metric) => {
        if (metric === 'sensitivity' || metric === 'accuracy') {
          const stats = computeStats(members.map((row) => row.result).filter(Boolean) as PatientResult[]);
          acc[metric] = metric === 'sensitivity' ? stats.sens : stats.acc;
        } else {
          const metricValues = members.map((row) => getAverageMetricValue(metric, row)).filter((entry): entry is number => entry != null);
          acc[metric] = metricValues.length ? metricValues.reduce((sum, entry) => sum + entry, 0) / metricValues.length : 0;
        }
        return acc;
      }, {});
      return { label: band, count: members.length, values };
    }).filter((item): item is SingleMetricRow | GroupedMetricRow => item !== null);

    if (clinicalKeys.length === 1) {
      return {
        type: 'horizontal',
        title: `${getClinicalTitle(clinicalKeys[0])} by ${getDemographicTitle(demoKey)}`,
        excluded: excluded.count,
        filteredOut: filteredOut.count,
        rows: grouped as SingleMetricRow[],
        chartWidth,
        color: CLINICAL_COLORS[clinicalKeys[0]],
      };
    }

    return {
      type: 'grouped',
      title: `${clinicalKeys.map((metric) => getClinicalTitle(metric)).join(' vs ')} by ${getDemographicTitle(demoKey)}`,
      excluded: excluded.count,
      filteredOut: filteredOut.count,
      groups: grouped as GroupedMetricRow[],
      metrics: clinicalKeys,
      chartWidth,
    };
  }, [generatedChart, enrichedPatients, width]);

  const analysisExplanation = useMemo(() => getAnalysisExplanation(analysis), [analysis]);

  function toggleDemographic(key: DemographicKey) {
    setSelectedDemographics((prev) => {
      if (prev.includes(key)) {
        setSubgroupFilters((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
        return prev.filter((item) => item !== key);
      }
      if (prev.length >= 2) return prev;
      setSubgroupFilters((current) => ({
        ...current,
        [key]: getDemographicOrder(key),
      }));
      return [...prev, key];
    });
  }

  function toggleSubgroup(demographic: DemographicKey, subgroup: string) {
    setSubgroupFilters((current) => {
      const selected = getSelectedBands(demographic, current);
      const exists = selected.includes(subgroup);
      const nextValues = exists
        ? selected.filter((item) => item !== subgroup)
        : [...selected, subgroup];

      return {
        ...current,
        [demographic]: getDemographicOrder(demographic).filter((band) => nextValues.includes(band)),
      };
    });
  }

  function toggleClinical(key: ClinicalKey) {
    setSelectedClinical((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}> 
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 36, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>Analytics Explorer</Text>
          <Text style={styles.subtitle}>Build demographic versus clinical comparisons from the current RPI cohort.</Text>
        </View>

        <View style={styles.selectorGrid}>
          <View style={styles.selectorColumn}>
            <Text style={styles.selectorTitle}>DEMOGRAPHICS</Text>
            <Text style={styles.selectorHint}>Select 1-2 fields</Text>
            {DEMOGRAPHIC_OPTIONS.map((option) => (
              <SelectionChip
                key={option.key}
                label={option.label}
                selected={selectedDemographics.includes(option.key)}
                onPress={() => toggleDemographic(option.key)}
                disabled={!selectedDemographics.includes(option.key) && selectedDemographics.length >= 2}
              />
            ))}

            {selectedDemographics.length > 0 && (
              <View style={styles.subgroupSection}>
                <Text style={styles.subgroupTitle}>Subdivide selections</Text>
                <Text style={styles.subgroupHint}>Narrow each demographic to the exact subgroup values you want to include.</Text>
                {selectedDemographics.map((key) => (
                  <View key={key} style={styles.subgroupCard}>
                    <Text style={styles.subgroupLabel}>{getDemographicTitle(key)}</Text>
                    <View style={styles.subgroupChipRow}>
                      {getDemographicOrder(key).map((band) => {
                        const selected = getSelectedBands(key, subgroupFilters).includes(band);
                        return (
                          <SelectionChip
                            key={`${key}-${band}`}
                            label={band}
                            selected={selected}
                            onPress={() => toggleSubgroup(key, band)}
                          />
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.selectorColumn}>
            <Text style={styles.selectorTitle}>CLINICAL</Text>
            <Text style={styles.selectorHint}>Select 1-3 metrics</Text>
            {CLINICAL_OPTIONS.map((option) => (
              <SelectionChip
                key={option.key}
                label={option.label}
                selected={selectedClinical.includes(option.key)}
                onPress={() => toggleClinical(option.key)}
                disabled={!selectedClinical.includes(option.key) && selectedClinical.length >= 3}
              />
            ))}
          </View>
        </View>

        <View style={styles.selectionRuleCard}>
          <Text style={styles.selectionRuleText}>Minimum 1 demographic and 1 clinical selection. Maximum 2 demographics and 3 clinical metrics.</Text>
          {!allDemographicsHaveSubgroups && selectedDemographics.length > 0 && (
            <Text style={styles.selectionWarning}>Choose at least one subgroup for every selected demographic.</Text>
          )}
          {!combinationSupported && minimumMet && (
            <Text style={styles.selectionWarning}>Supported combinations: 1 demographic + 1-3 clinical metrics, or 2 demographics + 1 clinical metric.</Text>
          )}
        </View>

        {minimumMet && (
          <TouchableOpacity
            style={[styles.generateButton, !combinationSupported && styles.generateButtonDisabled]}
            onPress={() => setGeneratedChart({
              demographics: selectedDemographics,
              clinical: selectedClinical,
              subgroupFilters: selectedDemographics.reduce<Partial<Record<DemographicKey, string[]>>>((acc, key) => {
                acc[key] = getSelectedBands(key, subgroupFilters);
                return acc;
              }, {}),
            })}
            disabled={!combinationSupported}
            activeOpacity={0.85}
          >
            <Text style={styles.generateButtonText}>Generate Chart</Text>
          </TouchableOpacity>
        )}

        <View style={styles.chartCard}>
          {!analysis && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No chart generated yet</Text>
              <Text style={styles.emptyStateText}>Choose at least one demographic and one clinical metric, then generate the chart.</Text>
            </View>
          )}

          {analysis && (
            <>
              <Text style={styles.chartTitle}>{analysis.title}</Text>
              <Text style={styles.chartNote}>
                {analysis.excluded} patients excluded due to missing data{analysis.filteredOut > 0 ? ` · ${analysis.filteredOut} outside selected subgroups` : ''}
              </Text>
              {analysisExplanation && <Text style={styles.chartExplanation}>{analysisExplanation}</Text>}

              {analysis.type === 'horizontal' && <HorizontalBarChart rows={analysis.rows} width={analysis.chartWidth} color={analysis.color} />}
              {analysis.type === 'grouped' && <GroupedBarChart groups={analysis.groups} metrics={analysis.metrics} width={analysis.chartWidth} />}
              {analysis.type === 'stacked' && <StackedTierChart rows={analysis.rows} width={Math.min(analysis.chartWidth, 680)} />}
              {analysis.type === 'heatmap' && <HeatmapChart rows={analysis.rowLabels} columns={analysis.columnLabels} cells={analysis.cells} />}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  headerCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 18,
    padding: 20,
    marginTop: 14,
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    color: Colors.text,
    ...fonts.semibold,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
    ...fonts.regular,
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  selectorColumn: {
    flex: 1,
    minWidth: 320,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 18,
    padding: 16,
  },
  selectorTitle: {
    fontSize: 12,
    color: Colors.text,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
    ...fonts.semibold,
  },
  selectorHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    ...fonts.regular,
  },
  selectorChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  selectorChipIdle: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  selectorChipSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#1E40AF',
  },
  selectorChipDisabled: {
    opacity: 0.55,
  },
  selectorChipText: {
    fontSize: 13,
    color: '#4b5563',
    ...fonts.medium,
  },
  selectorChipTextSelected: {
    color: '#1E40AF',
  },
  subgroupSection: {
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  subgroupTitle: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 4,
    ...fonts.semibold,
  },
  subgroupHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
    ...fonts.regular,
  },
  subgroupCard: {
    marginBottom: 12,
  },
  subgroupLabel: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 8,
    ...fonts.medium,
  },
  subgroupChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionRuleCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  selectionRuleText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    ...fonts.regular,
  },
  selectionWarning: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 8,
    lineHeight: 18,
    ...fonts.medium,
  },
  generateButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#1E40AF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  generateButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  generateButtonText: {
    color: Colors.white,
    fontSize: 13,
    ...fonts.semibold,
  },
  chartCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 4,
    ...fonts.semibold,
  },
  chartNote: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 16,
    ...fonts.regular,
  },
  chartExplanation: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 16,
    ...fonts.regular,
  },
  emptyState: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 6,
    ...fonts.semibold,
  },
  emptyStateText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 18,
    ...fonts.regular,
  },
  legendRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendItemText: {
    fontSize: 11,
    color: Colors.textMuted,
    ...fonts.medium,
  },
  stackedWrap: {
    gap: 14,
  },
  stackedRow: {
    gap: 6,
  },
  stackedHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stackedLabel: {
    fontSize: 13,
    color: Colors.text,
    ...fonts.medium,
  },
  stackedCount: {
    fontSize: 11,
    color: Colors.textMuted,
    ...fonts.regular,
  },
  stackedTrack: {
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    flexDirection: 'row',
  },
  stackedSegment: {
    height: '100%',
  },
  stackedMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    ...fonts.regular,
  },
  heatmapWrap: {
    gap: 8,
  },
  heatmapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heatmapCorner: {
    width: 110,
  },
  heatmapHeaderText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    ...fonts.medium,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  heatmapRowLabel: {
    width: 110,
    fontSize: 12,
    color: Colors.text,
    paddingTop: 14,
    ...fonts.medium,
  },
  heatmapCell: {
    flex: 1,
    minHeight: 68,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  heatmapValue: {
    fontSize: 16,
    color: Colors.white,
    ...fonts.semibold,
  },
  heatmapCount: {
    fontSize: 10,
    color: Colors.white,
    marginTop: 4,
    ...fonts.regular,
  },
});
