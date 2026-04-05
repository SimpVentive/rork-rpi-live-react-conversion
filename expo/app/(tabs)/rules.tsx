import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRPI } from '@/contexts/RPIContext';
import { optimiseWeights, explainRule, compareConfigs, RuleConfig } from '@/data/rulesEngine';
import Colors from '@/constants/colors';

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

function ConfigCard({ config, selected, onApply, onSelect }: { config: RuleConfig; selected: boolean; onApply: () => void; onSelect: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.configCard, selected && styles.configCardSelected]}
      activeOpacity={0.85}
      onPress={onSelect}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.configTitle}>Top Config</Text>
        <Text style={styles.configScore}>{config.score.toFixed(0)}</Text>
      </View>
      <Text style={styles.configMeta}>Acc {config.accuracy}% · Prec {config.precision}% · Sens {config.sensitivity}%</Text>
      <View style={styles.weightsRow}>
        <Text style={styles.weightsLabel}>Weights:</Text>
        <Text style={styles.weightsValue}>STart {config.weights.start}% | ROM {config.weights.rom}% | Physio {config.weights.physio}%</Text>
      </View>
      <View style={styles.weightsRow}>
        <Text style={styles.weightsLabel}>More:</Text>
        <Text style={styles.weightsValue}>Anthro {config.weights.anthro}% | Comor {config.weights.comor}% | Life {config.weights.life}%</Text>
      </View>
      <Text style={styles.thresholds}>G→A: {config.tga} | A→R: {config.tar}</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={onApply} activeOpacity={0.8}>
        <Text style={styles.primaryBtnText}>Apply configuration</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function RulesScreen() {
  const insets = useSafeAreaInsets();
  const { patients, W, SW, tga, tar, setW, setSW, setTGA, setTAR, stats } = useRPI();
  const [configs, setConfigs] = useState<RuleConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<RuleConfig | null>(null);
  const [explainText, setExplainText] = useState<string>('Select a proposed rule to see a summary explanation.');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const currentRuleConfig = useMemo<RuleConfig>(() => ({
    weights: W,
    subWeights: SW,
    tga,
    tar,
    score: stats.acc,
    sensitivity: stats.sens,
    precision: stats.prec,
    accuracy: stats.acc,
  }), [W, SW, tga, tar, stats]);

  const comparison = useMemo(() => {
    if (configs.length === 0) return null;
    return compareConfigs(configs[0], currentRuleConfig, patients);
  }, [configs, currentRuleConfig, patients]);

  const runOptimization = useCallback(() => {
    if (patients.length === 0) return;
    setIsOptimizing(true);
    setConfigs([]);
    setSelectedConfig(null);
    setExplainText('Optimizing rule weights, please wait...');
    setTimeout(() => {
      const proposed = optimiseWeights(patients, 900);
      setConfigs(proposed);
      if (proposed.length > 0) {
        setSelectedConfig(proposed[0]);
        const explanation = explainRule(proposed[0], patients);
        setExplainText(explanation.summary);
      } else {
        setExplainText('No viable rule configurations could be generated with the current dataset.');
      }
      setIsOptimizing(false);
    }, 60);
  }, [patients]);

  const handleApplyConfig = useCallback((config: RuleConfig) => {
    setW(config.weights);
    setSW(config.subWeights);
    setTGA(config.tga);
    setTAR(config.tar);
    setSelectedConfig(config);
    const explanation = explainRule(config, patients);
    setExplainText(explanation.summary);
  }, [patients, setW, setSW, setTGA, setTAR]);

  const handleSelectConfig = useCallback((config: RuleConfig) => {
    setSelectedConfig(config);
    const explanation = explainRule(config, patients);
    setExplainText(explanation.summary);
  }, [patients]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}> 
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 12 }} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Rules Engine</Text>
            <Text style={styles.subtitle}>Discover and compare optimized RPI weight configurations.</Text>
          </View>
          <TouchableOpacity style={styles.optimizeBtn} onPress={runOptimization} activeOpacity={0.8}>
            {isOptimizing ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.optimizeBtnText}>Optimize</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <MetricCard label="Patients" value={patients.length} color={Colors.textDark} />
          <MetricCard label="Current Acc" value={`${stats.acc}%`} color={stats.acc >= 70 ? Colors.greenDark : Colors.amberDark} />
          <MetricCard label="Current Prec" value={`${stats.prec}%`} color={stats.prec >= 70 ? Colors.greenDark : Colors.amberDark} />
          <MetricCard label="Current Sens" value={`${stats.sens}%`} color={stats.sens >= 70 ? Colors.greenDark : Colors.amberDark} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Proposed Configurations</Text>
          <Text style={styles.sectionSub}>Find the strongest rule candidates evaluated on the current patient set.</Text>
        </View>

        {configs.length === 0 && !isOptimizing && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Run the optimizer to generate rule recommendations from the current patient data.</Text>
          </View>
        )}

        {configs.map((config, index) => (
          <ConfigCard
            key={`${config.tga}-${config.tar}-${index}`}
            config={config}
            selected={selectedConfig?.tga === config.tga && selectedConfig?.tar === config.tar && selectedConfig?.score === config.score}
            onApply={() => handleApplyConfig(config)}
            onSelect={() => handleSelectConfig(config)}
          />
        ))}

        {comparison && (
          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonTitle}>Current Model vs Best Rule</Text>
            <View style={styles.comparisonGrid}>
              {Object.entries(comparison).map(([site, winner]) => (
                <View key={site} style={styles.comparisonRow}>
                  <Text style={styles.comparisonSite}>{site}</Text>
                  <Text style={[styles.comparisonValue, winner === 'A' ? { color: Colors.blue } : winner === 'B' ? { color: Colors.greenDark } : { color: Colors.textMuted }]}>
                    {winner === 'Tie' ? 'Tie' : winner === 'A' ? 'Current' : 'Rule'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.explanationBox}>
          <Text style={styles.explanationTitle}>Selected Rule Summary</Text>
          <Text style={styles.explanationText}>{explainText}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0f1a',
  },
  titleRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textWhite,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    maxWidth: '72%',
  },
  optimizeBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  optimizeBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    letterSpacing: 0.4,
    marginBottom: 4,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textDark,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
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
  emptyState: {
    marginTop: 12,
    padding: 20,
    backgroundColor: '#09101d',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 14,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  configCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
  },
  configCardSelected: {
    borderColor: Colors.blue,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  configTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  configScore: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.blue,
  },
  configMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  weightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  weightsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    width: 84,
  },
  weightsValue: {
    fontSize: 12,
    color: Colors.textDark,
    flex: 1,
  },
  thresholds: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.blue,
    marginBottom: 12,
  },
  primaryBtn: {
    marginTop: 6,
    backgroundColor: Colors.blue,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  comparisonCard: {
    backgroundColor: '#08121e',
    borderWidth: 1,
    borderColor: '#1f406d',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  comparisonTitle: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
  },
  comparisonGrid: {
    gap: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  comparisonSite: {
    color: Colors.textMuted,
    fontWeight: '700',
  },
  comparisonValue: {
    fontWeight: '900',
  },
  explanationBox: {
    backgroundColor: '#091623',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#173a66',
    padding: 16,
    marginBottom: 30,
  },
  explanationTitle: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  explanationText: {
    color: Colors.textMuted,
    lineHeight: 20,
    fontSize: 13,
  },
});
