import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, Save, Circle, ChevronDown, ChevronUp, Database, Download } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRPI } from '@/contexts/RPIContext';
import Colors from '@/constants/colors';
import { SavedScenario, PatientSnapshot } from '@/data/types';
import { tierColor, riskColor, riskLabel } from '@/data/scoring';
import { escapeHtml, exportExcelHtmlReport } from '@/lib/excelExport';

type PatientMeta = { age: number; gender: 'M' | 'F' };

function WeightBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.round(value / total * 100)) : 0;
  return (
    <View style={wbStyles.container}>
      <Text style={wbStyles.label}>{label}</Text>
      <View style={wbStyles.barTrack}>
        <View style={[wbStyles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[wbStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const wbStyles = StyleSheet.create({
  container: { marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  barTrack: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 2 },
  barFill: { height: 6, borderRadius: 3 },
  value: { fontSize: 14, fontWeight: '800', textAlign: 'right' },
});

function SubWeightChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={swcStyles.chip}>
      <Text style={[swcStyles.text, { color }]}>{label} {value}%</Text>
    </View>
  );
}

const swcStyles = StyleSheet.create({
  chip: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, margin: 2 },
  text: { fontSize: 11, fontWeight: '700' },
});

function PatientRow({ p, displayName }: { p: PatientSnapshot; displayName: string }) {
  const tc = tierColor(p.tier);
  const rc = riskColor(p.manualRisk);
  return (
    <View style={prStyles.row}>
      <View style={prStyles.nameCol}>
        <Text style={prStyles.name} numberOfLines={1}>{displayName}</Text>
      </View>
      <Text style={[prStyles.rpi, { color: tc }]}>{p.rpi}</Text>
      <View style={[prStyles.tierPill, { backgroundColor: tc + '18', borderColor: tc }]}>
        <Text style={[prStyles.tierText, { color: tc }]}>{p.tier}</Text>
      </View>
      <Text style={[prStyles.manual, { color: rc }]}>{riskLabel(p.manualRisk)}</Text>
    </View>
  );
}

const prStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 6 },
  nameCol: { flex: 1 },
  name: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  rpi: { width: 30, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  tierPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  tierText: { fontSize: 10, fontWeight: '700' },
  manual: { width: 55, fontSize: 11, fontWeight: '700', textAlign: 'right' },
});

const ScenarioCard = React.memo(function ScenarioCard({
  sc,
  scenarioNumber,
  patientMetaByName,
  onDelete,
  getDisplayName,
}: {
  sc: SavedScenario;
  scenarioNumber: number;
  patientMetaByName: Map<string, PatientMeta>;
  onDelete: () => void;
  getDisplayName: (n: string) => string;
}) {
  const total = sc.W.start + sc.W.rom + sc.W.physio + sc.W.anthro + sc.W.comor + sc.W.life;
  const [showSubWeights, setShowSubWeights] = useState<boolean>(false);
  const [showPatients, setShowPatients] = useState<boolean>(false);

  const sw = sc.SW;
  const enrichedPatients = sc.patients.map((p) => {
    const meta = patientMetaByName.get(p.name);
    return {
      ...p,
      age: typeof p.age === 'number' ? p.age : meta?.age,
      gender: p.gender || meta?.gender,
    };
  });
  const cohortSize = enrichedPatients.length || sc.total;
  const femaleCount = enrichedPatients.filter((p) => p.gender === 'F').length;
  const maleCount = enrichedPatients.filter((p) => p.gender === 'M').length;
  const patientsWithAge = enrichedPatients.filter((p) => typeof p.age === 'number');
  const averageAge = patientsWithAge.length > 0
    ? (patientsWithAge.reduce((sum, p) => sum + (p.age || 0), 0) / patientsWithAge.length).toFixed(1)
    : null;

  return (
    <View style={scStyles.card}>
      <View style={scStyles.header}>
        <View>
          <View style={scStyles.headerRow}>
            <Save size={14} color={Colors.blue} />
            <Text style={scStyles.timestamp}>Scenario {scenarioNumber}</Text>
          </View>
          <Text style={scStyles.dateText}>Date: {sc.ts}</Text>
        </View>
        <TouchableOpacity style={scStyles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
          <Trash2 size={14} color={Colors.redDark} />
          <Text style={scStyles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={scStyles.cohortCard}>
        <Text style={scStyles.cohortTitle}>Cohort Data</Text>
        <Text style={scStyles.cohortText}>Size: {cohortSize}</Text>
        <Text style={scStyles.cohortText}>Gender Distribution: Female {femaleCount}, Male {maleCount}</Text>
        <Text style={scStyles.cohortText}>Average Age: {averageAge ?? 'N/A'}</Text>
      </View>

      <Text style={scStyles.sectionTitle}>Group Weights (sum={total})</Text>
      <View style={scStyles.weightsGrid}>
        <WeightBar label="STarT" value={sc.W.start} total={total} color={Colors.blue} />
        <WeightBar label="VR ROM" value={sc.W.rom} total={total} color={Colors.green} />
        <WeightBar label="Physio" value={sc.W.physio} total={total} color={Colors.purple} />
        <WeightBar label="Anthropo" value={sc.W.anthro} total={total} color={Colors.amber} />
        <WeightBar label="Comorbid" value={sc.W.comor} total={total} color={Colors.red} />
        <WeightBar label="Lifestyle" value={sc.W.life} total={total} color={Colors.textMuted} />
      </View>

      <TouchableOpacity
        style={scStyles.expandBtn}
        onPress={() => setShowSubWeights(!showSubWeights)}
        activeOpacity={0.7}
      >
        {showSubWeights ? <ChevronUp size={14} color="#1e40af" /> : <ChevronDown size={14} color="#1e40af" />}
        <Text style={scStyles.expandBtnText}>Sub-Weights</Text>
      </TouchableOpacity>

      {showSubWeights && sw && (
        <View style={scStyles.subWeightsBox}>
          <View style={scStyles.swGroup}>
            <Text style={[scStyles.swGroupTitle, { color: Colors.green }]}>VR ROM</Text>
            <View style={scStyles.swChips}>
              <SubWeightChip label="Flex" value={sw.rom.flex} color="#16a34a" />
              <SubWeightChip label="Ext" value={sw.rom.ext} color="#15803d" />
              <SubWeightChip label="LRot" value={sw.rom.lrot} color="#166534" />
              <SubWeightChip label="RRot" value={sw.rom.rrot} color="#14532d" />
            </View>
          </View>
          <View style={scStyles.swGroup}>
            <Text style={[scStyles.swGroupTitle, { color: Colors.purple }]}>Physio</Text>
            <View style={scStyles.swChips}>
              <SubWeightChip label="FABER L" value={sw.physio.fabl} color="#7c3aed" />
              <SubWeightChip label="FAIR L" value={sw.physio.fairl} color="#7c3aed" />
              <SubWeightChip label="SLR L" value={sw.physio.slrl} color="#7c3aed" />
              <SubWeightChip label="FABER R" value={sw.physio.fabr} color="#6d28d9" />
              <SubWeightChip label="FAIR R" value={sw.physio.fairr} color="#6d28d9" />
              <SubWeightChip label="SLR R" value={sw.physio.slrr} color="#6d28d9" />
              <SubWeightChip label="Hyperext" value={sw.physio.hyp} color="#5b21b6" />
              <SubWeightChip label="Tender" value={sw.physio.tend} color="#5b21b6" />
              <SubWeightChip label="Tight" value={sw.physio.tight} color="#5b21b6" />
              <SubWeightChip label="Knots" value={sw.physio.knots} color="#5b21b6" />
            </View>
          </View>
          <View style={scStyles.swGroup}>
            <Text style={[scStyles.swGroupTitle, { color: Colors.amber }]}>Anthropo</Text>
            <View style={scStyles.swChips}>
              <SubWeightChip label="Age" value={sw.anthro.age} color="#b45309" />
              <SubWeightChip label="Gender" value={sw.anthro.gen} color="#92400e" />
            </View>
          </View>
          <View style={scStyles.swGroup}>
            <Text style={[scStyles.swGroupTitle, { color: Colors.red }]}>Comorbidity</Text>
            <View style={scStyles.swChips}>
              <SubWeightChip label="HTN" value={sw.comor.htn} color="#dc2626" />
              <SubWeightChip label="DM" value={sw.comor.dm} color="#dc2626" />
              <SubWeightChip label="OA" value={sw.comor.oa} color="#dc2626" />
              <SubWeightChip label="Osteo" value={sw.comor.osteo} color="#b91c1c" />
              <SubWeightChip label="Injury" value={sw.comor.inj} color="#b91c1c" />
              <SubWeightChip label="Surgery" value={sw.comor.surg} color="#b91c1c" />
              <SubWeightChip label="Thyroid" value={sw.comor.thyr} color="#991b1b" />
            </View>
          </View>
          <View style={scStyles.swGroup}>
            <Text style={[scStyles.swGroupTitle, { color: '#64748b' }]}>Lifestyle</Text>
            <View style={scStyles.swChips}>
              <SubWeightChip label="Inj Hx" value={sw.life.lifeinj} color="#475569" />
              <SubWeightChip label="Surg Hx" value={sw.life.lifesurg} color="#475569" />
              <SubWeightChip label="Smoke" value={sw.life.smoke} color="#475569" />
              <SubWeightChip label="Alcohol" value={sw.life.alcohol} color="#475569" />
              <SubWeightChip label="Sitting" value={sw.life.sitting} color="#475569" />
              <SubWeightChip label="Standing" value={sw.life.standing} color="#475569" />
            </View>
          </View>
        </View>
      )}

      <View style={scStyles.thresholds}>
        <Text style={scStyles.thresholdLabel}>Thresholds:</Text>
        <Text style={[scStyles.thresholdValue, { color: Colors.greenDark }]}>G→A: {sc.TGA}</Text>
        <Text style={[scStyles.thresholdValue, { color: Colors.amberDark }]}>A→R: {sc.TAR}</Text>
      </View>

      <View style={scStyles.tierSummary}>
        <View style={[scStyles.tierChip, { backgroundColor: Colors.greenBg, borderColor: '#86efac' }]}>
          <Circle size={8} color={Colors.greenDark} fill={Colors.greenDark} />
          <Text style={[scStyles.tierChipText, { color: Colors.greenDark }]}>Green: {sc.green}</Text>
        </View>
        <View style={[scStyles.tierChip, { backgroundColor: Colors.amberBg, borderColor: '#fde047' }]}>
          <Circle size={8} color={Colors.amberDark} fill={Colors.amberDark} />
          <Text style={[scStyles.tierChipText, { color: Colors.amberDark }]}>Amber: {sc.amber}</Text>
        </View>
        <View style={[scStyles.tierChip, { backgroundColor: Colors.redBg, borderColor: '#fca5a5' }]}>
          <Circle size={8} color={Colors.redDark} fill={Colors.redDark} />
          <Text style={[scStyles.tierChipText, { color: Colors.redDark }]}>Red: {sc.red}</Text>
        </View>
        <Text style={scStyles.totalNote}>of {sc.total}</Text>
      </View>

      <View style={scStyles.metricsRow}>
        <Text style={scStyles.metricText}>
          Sensitivity: <Text style={{ color: sc.sens >= 70 ? Colors.greenDark : Colors.redDark, fontWeight: '800' as const }}>{sc.sens}%</Text>
        </Text>
        <Text style={scStyles.metricText}>
          Precision: <Text style={{ color: sc.prec >= 70 ? Colors.greenDark : Colors.amberDark, fontWeight: '800' as const }}>{sc.prec}%</Text>
        </Text>
        <Text style={scStyles.metricText}>
          Accuracy: <Text style={{ color: sc.acc >= 75 ? Colors.greenDark : Colors.amberDark, fontWeight: '800' as const }}>{sc.acc}%</Text>
        </Text>
      </View>

      {sc.patients && sc.patients.length > 0 && (
        <>
          <TouchableOpacity
            style={scStyles.expandBtn}
            onPress={() => setShowPatients(!showPatients)}
            activeOpacity={0.7}
          >
            <Database size={14} color="#1e40af" />
            <Text style={scStyles.expandBtnText}>
              {showPatients ? 'Hide' : 'Show'} Per-Patient Data ({sc.patients.length})
            </Text>
            {showPatients ? <ChevronUp size={14} color="#1e40af" /> : <ChevronDown size={14} color="#1e40af" />}
          </TouchableOpacity>

          {showPatients && (
            <View style={scStyles.patientsBox}>
              <View style={scStyles.ptHeader}>
                <Text style={[scStyles.ptHeaderText, { flex: 1 }]}>Name</Text>
                <Text style={[scStyles.ptHeaderText, { width: 30, textAlign: 'center' }]}>RPI</Text>
                <Text style={[scStyles.ptHeaderText, { width: 50, textAlign: 'center' }]}>Tier</Text>
                <Text style={[scStyles.ptHeaderText, { width: 55, textAlign: 'right' }]}>Manual</Text>
              </View>
              {sc.patients.map((p) => (
                <PatientRow key={p.name} p={p} displayName={getDisplayName(p.name)} />
              ))}
              <View style={scStyles.aiNote}>
                <Text style={scStyles.aiNoteText}>
                  Complete per-patient snapshot with RPI scores, manual classifications, and domain scores preserved for AI model training.
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
});

const scStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 12, padding: 16, marginBottom: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timestamp: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  dateText: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#fca5a5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  deleteText: { fontSize: 13, fontWeight: '700', color: Colors.redDark },
  cohortCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12 },
  cohortTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  cohortText: { fontSize: 13, color: '#475569', marginBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  weightsGrid: { marginBottom: 12 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, marginBottom: 12 },
  expandBtnText: { fontSize: 13, fontWeight: '700', color: '#1e40af', flex: 1 },
  subWeightsBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12 },
  swGroup: { marginBottom: 10 },
  swGroupTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  swChips: { flexDirection: 'row', flexWrap: 'wrap' },
  thresholds: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  thresholdLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  thresholdValue: { fontSize: 13, fontWeight: '700' },
  tierSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 },
  tierChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  tierChipText: { fontSize: 13, fontWeight: '700' },
  totalNote: { fontSize: 13, color: Colors.textMuted },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 10 },
  metricText: { fontSize: 13, color: '#475569' },
  patientsBox: { backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 4 },
  ptHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: '#e2e8f0', marginBottom: 4, gap: 6 },
  ptHeaderText: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
  aiNote: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 6, padding: 10, marginTop: 10 },
  aiNoteText: { fontSize: 11, color: '#15803d', fontWeight: '600', lineHeight: 16 },
});

function buildScenarioTrendSvg(scenarios: SavedScenario[]): string {
  if (scenarios.length === 0) return '<p class="note">No saved scenarios available.</p>';

  const width = 820;
  const height = 260;
  const leftPad = 42;
  const bottomPad = 48;
  const topPad = 18;
  const innerWidth = width - leftPad - 12;
  const innerHeight = height - topPad - bottomPad;
  const barWidth = Math.max(18, innerWidth / Math.max(scenarios.length, 1) - 18);

  const bars = scenarios.map((scenario, index) => {
    const x = leftPad + index * (barWidth + 18);
    const barHeight = (scenario.acc / 100) * innerHeight;
    const y = topPad + innerHeight - barHeight;
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="#1d4ed8" />
      <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#0f172a">${scenario.acc}%</text>
      <text x="${x + barWidth / 2}" y="${height - 24}" text-anchor="middle" font-size="10" fill="#475569">S${index + 1}</text>
    `;
  }).join('');

  const ticks = [0, 25, 50, 75, 100].map((tick) => {
    const y = topPad + innerHeight - (tick / 100) * innerHeight;
    return `
      <line x1="${leftPad}" y1="${y}" x2="${width - 8}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />
      <text x="4" y="${y + 4}" font-size="10" fill="#64748b">${tick}</text>
    `;
  }).join('');

  return `<div class="svg-wrap"><h3>Scenario Accuracy Trend</h3><svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${ticks}${bars}</svg></div>`;
}

function buildGroupWeightSvg(scenario: SavedScenario): string {
  const groups = [
    ['STarT', scenario.W.start, '#2563eb'],
    ['ROM', scenario.W.rom, '#16a34a'],
    ['Physio', scenario.W.physio, '#7c3aed'],
    ['Anthropo', scenario.W.anthro, '#d97706'],
    ['Comorbidity', scenario.W.comor, '#dc2626'],
    ['Lifestyle', scenario.W.life, '#475569'],
  ] as const;
  const width = 720;
  const rowHeight = 34;
  const leftPad = 124;
  const chartWidth = width - leftPad - 24;
  const total = groups.reduce((sum, [, value]) => sum + value, 0) || 1;
  const rows = groups.map(([label, value, color], index) => {
    const y = 12 + index * rowHeight;
    const barWidth = (value / total) * chartWidth;
    return `
      <text x="0" y="${y + 14}" font-size="11" font-weight="700" fill="#334155">${escapeHtml(label)}</text>
      <rect x="${leftPad}" y="${y}" width="${chartWidth}" height="16" rx="8" fill="#e2e8f0" />
      <rect x="${leftPad}" y="${y}" width="${barWidth}" height="16" rx="8" fill="${color}" />
      <text x="${leftPad + chartWidth + 8}" y="${y + 13}" font-size="11" fill="#0f172a">${value}</text>
    `;
  }).join('');
  return `<div class="svg-wrap"><h3>Group Weight Mix</h3><svg width="${width}" height="${groups.length * rowHeight + 14}" viewBox="0 0 ${width} ${groups.length * rowHeight + 14}" xmlns="http://www.w3.org/2000/svg">${rows}</svg></div>`;
}

function buildTierDistributionSvg(scenario: SavedScenario): string {
  const total = Math.max(1, scenario.total);
  const green = (scenario.green / total) * 100;
  const amber = (scenario.amber / total) * 100;
  const red = (scenario.red / total) * 100;
  return `
    <div class="svg-wrap">
      <h3>Tier Distribution</h3>
      <svg width="720" height="80" viewBox="0 0 720 80" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="20" width="720" height="20" rx="10" fill="#e2e8f0" />
        <rect x="0" y="20" width="${7.2 * green}" height="20" rx="10" fill="#16a34a" />
        <rect x="${7.2 * green}" y="20" width="${7.2 * amber}" height="20" fill="#d97706" />
        <rect x="${7.2 * (green + amber)}" y="20" width="${7.2 * red}" height="20" rx="10" fill="#dc2626" />
        <text x="0" y="62" font-size="11" fill="#166534">Green ${scenario.green}</text>
        <text x="170" y="62" font-size="11" fill="#b45309">Amber ${scenario.amber}</text>
        <text x="340" y="62" font-size="11" fill="#b91c1c">Red ${scenario.red}</text>
      </svg>
    </div>
  `;
}

function buildSavedScenariosExportHtml(
  scenarios: SavedScenario[],
  patientMetaByName: Map<string, PatientMeta>,
  getDisplayName: (name: string) => string,
): string {
  const sortedScenarios = [...scenarios].sort((a, b) => (new Date(b.ts).getTime() || 0) - (new Date(a.ts).getTime() || 0));

  const summaryRows = sortedScenarios.map((scenario, index) => {
    const enrichedPatients = scenario.patients.map((patient) => {
      const meta = patientMetaByName.get(patient.name);
      return {
        ...patient,
        age: typeof patient.age === 'number' ? patient.age : meta?.age,
        gender: patient.gender || meta?.gender,
      };
    });
    const femaleCount = enrichedPatients.filter((patient) => patient.gender === 'F').length;
    const maleCount = enrichedPatients.filter((patient) => patient.gender === 'M').length;
    const patientsWithAge = enrichedPatients.filter((patient) => typeof patient.age === 'number');
    const averageAge = patientsWithAge.length > 0
      ? (patientsWithAge.reduce((sum, patient) => sum + (patient.age || 0), 0) / patientsWithAge.length).toFixed(1)
      : 'N/A';

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(scenario.ts)}</td>
        <td>${scenario.total}</td>
        <td>${femaleCount}</td>
        <td>${maleCount}</td>
        <td>${averageAge}</td>
        <td>${scenario.sens}%</td>
        <td>${scenario.prec}%</td>
        <td>${scenario.acc}%</td>
        <td>${scenario.TGA}</td>
        <td>${scenario.TAR}</td>
      </tr>
    `;
  }).join('');

  const scenarioDetails = sortedScenarios.map((scenario, index) => {
    const patientRows = scenario.patients.map((patient) => `
      <tr>
        <td>${escapeHtml(getDisplayName(patient.name))}</td>
        <td>${patient.rpi}</td>
        <td>${escapeHtml(patient.tier)}</td>
        <td>${escapeHtml(riskLabel(patient.manualRisk))}</td>
        <td>${patient.domainScores.start}</td>
        <td>${patient.domainScores.rom}</td>
        <td>${patient.domainScores.physio}</td>
        <td>${patient.domainScores.anthro}</td>
        <td>${patient.domainScores.comor}</td>
        <td>${patient.domainScores.life}</td>
      </tr>
    `).join('');

    return `
      <div class="card">
        <h2>Scenario ${index + 1}</h2>
        <p>Date: ${escapeHtml(scenario.ts)}</p>
        <div class="metric-grid">
          <span>Sensitivity ${scenario.sens}%</span>
          <span>Precision ${scenario.prec}%</span>
          <span>Accuracy ${scenario.acc}%</span>
          <span>Thresholds ${scenario.TGA} / ${scenario.TAR}</span>
        </div>
        ${buildGroupWeightSvg(scenario)}
        ${buildTierDistributionSvg(scenario)}
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>RPI</th>
              <th>Tier</th>
              <th>Manual</th>
              <th>STarT</th>
              <th>ROM</th>
              <th>Physio</th>
              <th>Anthropo</th>
              <th>Comorbidity</th>
              <th>Lifestyle</th>
            </tr>
          </thead>
          <tbody>${patientRows}</tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
    <h2>Scenario Summary</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Date</th>
          <th>Cohort</th>
          <th>Female</th>
          <th>Male</th>
          <th>Avg Age</th>
          <th>Sensitivity</th>
          <th>Precision</th>
          <th>Accuracy</th>
          <th>TGA</th>
          <th>TAR</th>
        </tr>
      </thead>
      <tbody>${summaryRows}</tbody>
    </table>
    ${buildScenarioTrendSvg(sortedScenarios)}
    ${scenarioDetails}
  `;
}

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { patients, savedScenarios, deleteScenario, clearAllScenarios, getDisplayName } = useRPI();
  const patientMetaByName = new Map(
    patients.map((patient) => [patient.name, { age: patient.age, gender: patient.g }]),
  );

  const handleDelete = useCallback((id: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteScenario(id);
  }, [deleteScenario]);

  const handleClearAll = useCallback(() => {
    Alert.alert('Clear All', 'Delete all saved scenarios?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => clearAllScenarios() },
    ]);
  }, [clearAllScenarios]);

  const handleExport = useCallback(async () => {
    if (savedScenarios.length === 0) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await exportExcelHtmlReport({
        fileNameBase: `saved_scenarios_${new Date().toISOString().slice(0, 10)}`,
        title: 'Saved Scenarios Export',
        subtitle: 'Excel-compatible report containing saved scenario data and chart snapshots.',
        bodyHtml: buildSavedScenariosExportHtml(savedScenarios, patientMetaByName, getDisplayName),
      });
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unable to export saved scenarios.');
    }
  }, [getDisplayName, patientMetaByName, savedScenarios]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topTitle}>Saved Scenarios</Text>
          <Text style={styles.topSub}>Weights + cohort scores for AI training</Text>
        </View>
        {savedScenarios.length > 0 && (
          <View style={styles.topBarActions}>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.7}>
              <Download size={14} color="#dbeafe" />
              <Text style={styles.exportBtnText}>Export XLS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll} activeOpacity={0.7}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {savedScenarios.length === 0 ? (
          <View style={styles.emptyCard}>
            <Save size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No saved scenarios yet</Text>
            <Text style={styles.emptyText}>Adjust weight sliders, set manual classifications, then tap Save to capture the full cohort snapshot.</Text>
          </View>
        ) : (
          savedScenarios.map((sc, index) => (
            <ScenarioCard
              key={sc.id}
              sc={sc}
              scenarioNumber={index + 1}
              patientMetaByName={patientMetaByName}
              onDelete={() => handleDelete(sc.id)}
              getDisplayName={getDisplayName}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0f1a',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a1020',
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textWhite,
  },
  topSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 7,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dbeafe',
  },
  clearBtn: {
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 7,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  emptyCard: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 36,
    alignItems: 'center',
    gap: 10,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
