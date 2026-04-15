import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart3, TrendingUp, Activity, Heart, Brain, User, Bone, Dumbbell } from 'lucide-react-native';
import { useRPI } from '@/contexts/RPIContext';
import Colors from '@/constants/colors';
import {
  sSTarT, sROM, sPhysio, sAnthropo, sComor, sLife,
  getMatchType,
} from '@/data/scoring';

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <View style={shStyles.row}>
      {icon}
      <Text style={shStyles.title}>{title}</Text>
    </View>
  );
}

const shStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, borderBottomWidth: 2, borderBottomColor: '#e2e8f0', paddingBottom: 10 },
  title: { fontSize: 13, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.7 },
});

function CohortBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0;
  return (
    <View style={cbStyles.row}>
      <Text style={cbStyles.label}>{label}</Text>
      <View style={cbStyles.barTrack}>
        <View style={[cbStyles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[cbStyles.count, { color }]}>{count}</Text>
      <Text style={cbStyles.pct}>{pct}%</Text>
    </View>
  );
}

const cbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { width: 70, fontSize: 13, fontWeight: '700', color: '#334155' },
  barTrack: { flex: 1, height: 10, backgroundColor: '#e2e8f0', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  count: { width: 30, fontSize: 14, fontWeight: '800', textAlign: 'right' },
  pct: { width: 36, fontSize: 12, color: '#94a3b8', textAlign: 'right' },
});

function DomainAvgBar({ label, high, moderate, low, icon }: {
  label: string; high: number; moderate: number; low: number; icon: React.ReactNode;
}) {
  const delta = high - low;
  const deltaColor = delta > 30 ? '#ef4444' : delta > 15 ? '#f59e0b' : '#94a3b8';
  return (
    <View style={daStyles.row}>
      <View style={daStyles.iconWrap}>{icon}</View>
      <View style={daStyles.info}>
        <Text style={daStyles.label}>{label}</Text>
        <View style={daStyles.vals}>
          <View style={daStyles.valBlock}>
            <Text style={[daStyles.val, { color: '#dc2626' }]}>{high}</Text>
            <Text style={daStyles.valLabel}>High</Text>
          </View>
          <View style={daStyles.valBlock}>
            <Text style={[daStyles.val, { color: '#b45309' }]}>{moderate}</Text>
            <Text style={daStyles.valLabel}>Mod</Text>
          </View>
          <View style={daStyles.valBlock}>
            <Text style={[daStyles.val, { color: '#15803d' }]}>{low}</Text>
            <Text style={daStyles.valLabel}>Low</Text>
          </View>
          <View style={[daStyles.deltaBox, { borderColor: deltaColor + '40' }]}>
            <Text style={[daStyles.deltaVal, { color: deltaColor }]}>Δ {delta > 0 ? '+' : ''}{delta}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const daStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconWrap: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  vals: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valBlock: { alignItems: 'center' },
  val: { fontSize: 16, fontWeight: '900' },
  valLabel: { fontSize: 9, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginTop: 1 },
  deltaBox: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 'auto' },
  deltaVal: { fontSize: 13, fontWeight: '800' },
});

export default function InferencesScreen() {
  const insets = useSafeAreaInsets();
  const { results, SW, W, getLifeOverride, stats, getDisplaySiteName } = useRPI();

  const cohortAnalysis = useMemo(() => {
    const groups: Record<string, typeof results> = { H: [], M: [], L: [], U: [] };
    results.forEach((r) => {
      if (groups[r.sr]) groups[r.sr].push(r);
    });

    const avg = (arr: typeof results, fn: (p: typeof results[0]) => number) =>
      arr.length ? Math.round(arr.reduce((s, p) => s + fn(p), 0) / arr.length) : 0;

    const domainAvgs = {
      start: { high: avg(groups.H, (p) => sSTarT(p)), mod: avg(groups.M, (p) => sSTarT(p)), low: avg(groups.L, (p) => sSTarT(p)) },
      rom: { high: avg(groups.H, (p) => sROM(p, SW)), mod: avg(groups.M, (p) => sROM(p, SW)), low: avg(groups.L, (p) => sROM(p, SW)) },
      physio: { high: avg(groups.H, (p) => sPhysio(p, SW)), mod: avg(groups.M, (p) => sPhysio(p, SW)), low: avg(groups.L, (p) => sPhysio(p, SW)) },
      anthro: { high: avg(groups.H, (p) => sAnthropo(p, SW)), mod: avg(groups.M, (p) => sAnthropo(p, SW)), low: avg(groups.L, (p) => sAnthropo(p, SW)) },
      comor: { high: avg(groups.H, (p) => sComor(p, SW)), mod: avg(groups.M, (p) => sComor(p, SW)), low: avg(groups.L, (p) => sComor(p, SW)) },
      life: {
        high: avg(groups.H, (p) => sLife(p, SW, getLifeOverride(p.name))),
        mod: avg(groups.M, (p) => sLife(p, SW, getLifeOverride(p.name))),
        low: avg(groups.L, (p) => sLife(p, SW, getLifeOverride(p.name))),
      },
    };

    const avgRpi = {
      high: avg(groups.H, (p) => p.rpi),
      mod: avg(groups.M, (p) => p.rpi),
      low: avg(groups.L, (p) => p.rpi),
    };

    const sites = ['KIMS', 'Kues', 'Abhis', 'SDD'];
    const siteBreakdown = sites.map((site) => {
      const sitePatients = results.filter((r) => r.site === site);
      const classed = sitePatients.filter((r) => r.sr !== 'U');
      const highs = classed.filter((r) => r.sr === 'H');
      const highRed = highs.filter((r) => r.tier === 'Red');
      const sens = highs.length ? Math.round(highRed.length / highs.length * 100) : null;
      return {
        site,
        total: sitePatients.length,
        green: sitePatients.filter((r) => r.tier === 'Green').length,
        amber: sitePatients.filter((r) => r.tier === 'Amber').length,
        red: sitePatients.filter((r) => r.tier === 'Red').length,
        classified: classed.length,
        sensitivity: sens,
      };
    });

    const concordance = {
      concordant: 0,
      partial: 0,
      discordant: 0,
      unclassified: 0,
    };
    results.forEach((r) => {
      const mt = getMatchType(r.sr, r.tier);
      if (mt === 'Concordant') concordance.concordant++;
      else if (mt === 'Partial') concordance.partial++;
      else if (mt === 'Discordant') concordance.discordant++;
      else concordance.unclassified++;
    });

    return { groups, domainAvgs, avgRpi, siteBreakdown, concordance };
  }, [results, SW, getLifeOverride]);

  const { domainAvgs, avgRpi, siteBreakdown, concordance } = cohortAnalysis;
  const classifiedTotal = concordance.concordant + concordance.partial + concordance.discordant;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Cohort Inferences</Text>
        <Text style={styles.topSub}>{results.length} patients · All sites</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingHorizontal: 16, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <SectionHeader title="RPI Tier Distribution" icon={<BarChart3 size={16} color="#1e40af" />} />
          <CohortBar label="Green" count={stats.green} total={stats.total} color="#22c55e" />
          <CohortBar label="Amber" count={stats.amber} total={stats.total} color="#f59e0b" />
          <CohortBar label="Red" count={stats.red} total={stats.total} color="#ef4444" />
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Sensitivity</Text>
              <Text style={[styles.metricValue, { color: stats.sens >= 70 ? '#15803d' : '#dc2626' }]}>{stats.sens}%</Text>
              <Text style={styles.metricNote}>High→Red</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Precision</Text>
              <Text style={[styles.metricValue, { color: stats.prec >= 70 ? '#15803d' : '#b45309' }]}>{stats.prec}%</Text>
              <Text style={styles.metricNote}>Red→High</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Accuracy</Text>
              <Text style={[styles.metricValue, { color: stats.acc >= 75 ? '#15803d' : '#b45309' }]}>{stats.acc}%</Text>
              <Text style={styles.metricNote}>Classified</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <SectionHeader title="RPI vs Manual Concordance" icon={<TrendingUp size={16} color="#1e40af" />} />
          <View style={styles.concordGrid}>
            <View style={[styles.concordBox, { borderColor: '#86efac' }]}>
              <Text style={[styles.concordVal, { color: '#15803d' }]}>{concordance.concordant}</Text>
              <Text style={styles.concordLabel}>Concordant</Text>
              {classifiedTotal > 0 && <Text style={styles.concordPct}>{Math.round(concordance.concordant / classifiedTotal * 100)}%</Text>}
            </View>
            <View style={[styles.concordBox, { borderColor: '#fde047' }]}>
              <Text style={[styles.concordVal, { color: '#b45309' }]}>{concordance.partial}</Text>
              <Text style={styles.concordLabel}>Partial</Text>
              {classifiedTotal > 0 && <Text style={styles.concordPct}>{Math.round(concordance.partial / classifiedTotal * 100)}%</Text>}
            </View>
            <View style={[styles.concordBox, { borderColor: '#fca5a5' }]}>
              <Text style={[styles.concordVal, { color: '#dc2626' }]}>{concordance.discordant}</Text>
              <Text style={styles.concordLabel}>Discordant</Text>
              {classifiedTotal > 0 && <Text style={styles.concordPct}>{Math.round(concordance.discordant / classifiedTotal * 100)}%</Text>}
            </View>
            <View style={[styles.concordBox, { borderColor: '#cbd5e1' }]}>
              <Text style={[styles.concordVal, { color: '#64748b' }]}>{concordance.unclassified}</Text>
              <Text style={styles.concordLabel}>Unclassified</Text>
            </View>
          </View>
          <View style={styles.avgRpiRow}>
            <Text style={styles.avgRpiTitle}>Avg RPI by Manual Risk:</Text>
            <View style={styles.avgRpiVals}>
              <Text style={[styles.avgRpiVal, { color: '#dc2626' }]}>High: {avgRpi.high}</Text>
              <Text style={[styles.avgRpiVal, { color: '#b45309' }]}>Mod: {avgRpi.mod}</Text>
              <Text style={[styles.avgRpiVal, { color: '#15803d' }]}>Low: {avgRpi.low}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <SectionHeader title="Domain Score Matrix — Avg by Risk Group" icon={<Activity size={16} color="#1e40af" />} />
          <DomainAvgBar label={`STarT Back (${W.start}%)`} high={domainAvgs.start.high} moderate={domainAvgs.start.mod} low={domainAvgs.start.low} icon={<Brain size={14} color={Colors.blue} />} />
          <DomainAvgBar label={`VR ROM (${W.rom}%)`} high={domainAvgs.rom.high} moderate={domainAvgs.rom.mod} low={domainAvgs.rom.low} icon={<Activity size={14} color={Colors.green} />} />
          <DomainAvgBar label={`Physio (${W.physio}%)`} high={domainAvgs.physio.high} moderate={domainAvgs.physio.mod} low={domainAvgs.physio.low} icon={<Dumbbell size={14} color={Colors.purple} />} />
          <DomainAvgBar label={`Anthropo (${W.anthro}%)`} high={domainAvgs.anthro.high} moderate={domainAvgs.anthro.mod} low={domainAvgs.anthro.low} icon={<User size={14} color={Colors.amber} />} />
          <DomainAvgBar label={`Comorbid (${W.comor}%)`} high={domainAvgs.comor.high} moderate={domainAvgs.comor.mod} low={domainAvgs.comor.low} icon={<Heart size={14} color={Colors.red} />} />
          <DomainAvgBar label={`Lifestyle (${W.life}%)`} high={domainAvgs.life.high} moderate={domainAvgs.life.mod} low={domainAvgs.life.low} icon={<Bone size={14} color={Colors.textMuted} />} />
          <View style={styles.legendRow}>
            <Text style={styles.legendNote}>Delta (Δ) = High avg - Low avg. Higher = better domain discrimination.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <SectionHeader title="Site Breakdown" icon={<BarChart3 size={16} color="#1e40af" />} />
          {siteBreakdown.map((s) => (
            <View key={s.site} style={styles.siteRow}>
              <View style={styles.siteHeader}>
                <Text style={styles.siteName}>{getDisplaySiteName(s.site)}</Text>
                <Text style={styles.siteCount}>n={s.total}</Text>
              </View>
              <View style={styles.siteTiers}>
                <View style={[styles.siteTierChip, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.siteTierText, { color: '#15803d' }]}>{s.green}</Text>
                </View>
                <View style={[styles.siteTierChip, { backgroundColor: '#fef9c3' }]}>
                  <Text style={[styles.siteTierText, { color: '#b45309' }]}>{s.amber}</Text>
                </View>
                <View style={[styles.siteTierChip, { backgroundColor: '#fee2e2' }]}>
                  <Text style={[styles.siteTierText, { color: '#dc2626' }]}>{s.red}</Text>
                </View>
                <Text style={styles.siteSens}>
                  Sens: {s.sensitivity !== null ? `${s.sensitivity}%` : 'N/A'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <SectionHeader title="Current Configuration" icon={<TrendingUp size={16} color="#1e40af" />} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Group Weights:</Text>
            <Text style={styles.configValue}>
              STarT {W.start}% · ROM {W.rom}% · Physio {W.physio}% · Anthro {W.anthro}% · Comorbid {W.comor}% · Life {W.life}%
            </Text>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Thresholds:</Text>
            <View style={styles.configThresh}>
              <Text style={[styles.threshVal, { color: '#15803d' }]}>G→A: {35}</Text>
              <Text style={[styles.threshVal, { color: '#b45309' }]}>A→R: {55}</Text>
            </View>
          </View>
          <View style={styles.configNote}>
            <Text style={styles.configNoteText}>
              Save this configuration as a scenario to preserve the complete cohort analysis with per-patient RPI and manual scores for future AI training.
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  metricNote: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  concordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  concordBox: {
    flex: 1,
    minWidth: 70,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  concordVal: {
    fontSize: 22,
    fontWeight: '900',
  },
  concordLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  concordPct: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  avgRpiRow: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  avgRpiTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 6,
  },
  avgRpiVals: {
    flexDirection: 'row',
    gap: 16,
  },
  avgRpiVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  legendRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendNote: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  siteRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  siteName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e40af',
  },
  siteCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  siteTiers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  siteTierChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  siteTierText: {
    fontSize: 13,
    fontWeight: '800',
  },
  siteSens: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginLeft: 'auto',
  },
  configRow: {
    marginBottom: 10,
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  configValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    lineHeight: 20,
  },
  configThresh: {
    flexDirection: 'row',
    gap: 16,
  },
  threshVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  configNote: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
  },
  configNoteText: {
    fontSize: 12,
    color: '#15803d',
    lineHeight: 18,
    fontWeight: '600',
  },
});
