import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRPI } from '@/contexts/RPIContext';
import Colors from '@/constants/colors';

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { stats, results, savedScenarios } = useRPI();

  const sortedScenarios = useMemo(() => {
    return [...savedScenarios].sort((a, b) => {
      const aTime = new Date(a.ts).getTime() || 0;
      const bTime = new Date(b.ts).getTime() || 0;
      return bTime - aTime;
    });
  }, [savedScenarios]);

  const latestScenario = sortedScenarios[0];
  const averageAccuracy = useMemo(() => {
    if (sortedScenarios.length === 0) return 0;
    return Math.round(sortedScenarios.reduce((sum, entry) => sum + entry.acc, 0) / sortedScenarios.length);
  }, [sortedScenarios]);

  const maxAcc = useMemo(() => {
    return Math.max(100, ...sortedScenarios.map((entry) => entry.acc));
  }, [sortedScenarios]);

  const statusBreakdown = useMemo(() => {
    const sites = ['KIMS', 'Kues', 'Abhis', 'SDD'] as const;
    return sites.map((site) => {
      const siteRows = results.filter((row) => row.site === site);
      return {
        site,
        total: siteRows.length,
        red: siteRows.filter((row) => row.tier === 'Red').length,
        amber: siteRows.filter((row) => row.tier === 'Amber').length,
        green: siteRows.filter((row) => row.tier === 'Green').length,
      };
    });
  }, [results]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}> 
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 12 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Analytics Dashboard</Text>
            <Text style={styles.subtitle}>Track saved scenario performance and current cohort alignment.</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <MetricCard label="Patients" value={results.length} />
          <MetricCard label="Saved Scenarios" value={savedScenarios.length} />
          <MetricCard label="Latest Acc" value={latestScenario ? `${latestScenario.acc}%` : '—'} color={latestScenario?.acc >= 75 ? Colors.greenDark : Colors.amberDark} />
          <MetricCard label="Avg Acc" value={`${averageAccuracy}%`} color={averageAccuracy >= 75 ? Colors.greenDark : Colors.amberDark} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Cohort Summary</Text>
          <Text style={styles.sectionSub}>Current RPI outcomes across each active site.</Text>
        </View>

        <View style={styles.siteGrid}>
          {statusBreakdown.map((site) => (
            <View key={site.site} style={styles.siteTile}>
              <Text style={styles.siteName}>{site.site}</Text>
              <Text style={styles.siteValue}>{site.total} patients</Text>
              <View style={styles.badgeRow}>
                <Text style={[styles.siteBadge, { backgroundColor: Colors.greenBg, color: Colors.greenDark }]}>G {site.green}</Text>
                <Text style={[styles.siteBadge, { backgroundColor: Colors.amberBg, color: Colors.amberDark }]}>A {site.amber}</Text>
                <Text style={[styles.siteBadge, { backgroundColor: Colors.redBg, color: Colors.redDark }]}>R {site.red}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Scenario Trend</Text>
          <Text style={styles.sectionSub}>Accuracy over saved scenario snapshots.</Text>
        </View>

        {sortedScenarios.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No saved scenarios yet. Generate a scenario from the dashboard to start tracking analytics.</Text>
          </View>
        ) : (
          <View style={styles.chartCard}>
            {sortedScenarios.map((scenario) => (
              <View key={scenario.id} style={styles.chartRow}>
                <View style={styles.chartLabelColumn}>
                  <Text style={styles.chartLabel}>{scenario.ts}</Text>
                  <Text style={styles.chartSub}>{`Acc ${scenario.acc}% · S ${scenario.sens}% · P ${scenario.prec}%`}</Text>
                </View>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartFill, { width: `${Math.round((scenario.acc / maxAcc) * 100)}%`, backgroundColor: Colors.blue }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {latestScenario && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Latest Saved Scenario</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Timestamp</Text>
              <Text style={styles.summaryValue}>{latestScenario.ts}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Results</Text>
              <Text style={styles.summaryValue}>{latestScenario.green}G · {latestScenario.amber}A · {latestScenario.red}R</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Thresholds</Text>
              <Text style={styles.summaryValue}>TGA {latestScenario.TGA} · TAR {latestScenario.TAR}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Weight Mix</Text>
              <Text style={styles.summaryValue}>ST {latestScenario.W.start}% · ROM {latestScenario.W.rom}% · Physio {latestScenario.W.physio}%</Text>
            </View>
          </View>
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
  headerRow: {
    marginTop: 14,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textWhite,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    maxWidth: '78%',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textDark,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textWhite,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  siteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  siteTile: {
    flex: 1,
    minWidth: 160,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  siteName: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 4,
  },
  siteValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.blue,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  siteBadge: {
    fontSize: 11,
    fontWeight: '900',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  chartCard: {
    backgroundColor: '#091623',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#173a66',
    padding: 16,
    marginBottom: 18,
  },
  chartRow: {
    marginBottom: 16,
  },
  chartLabelColumn: {
    marginBottom: 6,
  },
  chartLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  chartSub: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  chartTrack: {
    backgroundColor: '#162a47',
    borderRadius: 8,
    height: 12,
    overflow: 'hidden',
  },
  chartFill: {
    height: '100%',
    borderRadius: 8,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 16,
    marginBottom: 30,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 12,
    color: Colors.textDark,
    fontWeight: '900',
  },
  emptyState: {
    backgroundColor: Colors.surfaceMid,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
});
