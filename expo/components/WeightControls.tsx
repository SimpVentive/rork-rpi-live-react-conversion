import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, LayoutAnimation, Platform, UIManager, ActivityIndicator } from 'react-native';
import { ChevronDown, ChevronUp, Save, SlidersHorizontal, ChevronRight, AlertTriangle } from 'lucide-react-native';
import { useRPI } from '@/contexts/RPIContext';
import Slider from '@/components/Slider';
import Colors from '@/constants/colors';
import { GroupWeights, AllSubWeights } from '@/data/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SubWeightItem {
  key: string;
  label: string;
  section?: string;
}

interface DomainConfig {
  domainKey: keyof GroupWeights;
  subDomain: keyof AllSubWeights;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  note: string;
  items: SubWeightItem[];
}

const DOMAINS: DomainConfig[] = [
  {
    domainKey: 'start', subDomain: 'start', label: 'STarT Back', shortLabel: 'STarT', icon: '\u{1F4CB}', color: '#60a5fa',
    note: '9 psychosocial items (sum = 100)',
    items: [
      { key: 's1', label: 'Pain Bothersome' }, { key: 's2', label: 'Leg Pain (ref)' },
      { key: 's3', label: 'Body Spread Pain' }, { key: 's4', label: 'Catastrophizing' },
      { key: 's5', label: 'Anxiety' }, { key: 's6', label: 'Depression' },
      { key: 's7', label: 'Walking Difficulty' }, { key: 's8', label: 'Dressing Difficulty' },
      { key: 's9', label: 'Overall Fear' },
    ],
  },
  {
    domainKey: 'rom', subDomain: 'rom', label: 'VR ROM', shortLabel: 'ROM', icon: '\u{1F3A5}', color: '#22c55e',
    note: '4 directions of ROM pain (sum = 100)',
    items: [
      { key: 'flex', label: 'Flexion' }, { key: 'ext', label: 'Extension' },
      { key: 'lrot', label: 'Left Rotation' }, { key: 'rrot', label: 'Right Rotation' },
    ],
  },
  {
    domainKey: 'physio', subDomain: 'physio', label: 'Physio', shortLabel: 'Physio', icon: '\u{1F9D1}\u200D\u2695\uFE0F', color: '#a78bfa',
    note: '6 special tests + 4 exam findings (sum = 100)',
    items: [
      { key: 'fabl', label: 'FABER L', section: 'Special Tests' }, { key: 'fairl', label: 'FAIR L' },
      { key: 'slrl', label: 'SLR L' }, { key: 'fabr', label: 'FABER R' },
      { key: 'fairr', label: 'FAIR R' }, { key: 'slrr', label: 'SLR R' },
      { key: 'hyp', label: 'Hyperext Pain', section: 'Exam Findings' }, { key: 'tend', label: 'Tenderness' },
      { key: 'tight', label: 'Tightness' }, { key: 'knots', label: 'Muscle Knots' },
    ],
  },
  {
    domainKey: 'anthro', subDomain: 'anthro', label: 'Anthropo', shortLabel: 'Anthro', icon: '\u{1F464}', color: '#f59e0b',
    note: 'Age band vs Gender risk (sum = 100)',
    items: [{ key: 'age', label: 'Age Band' }, { key: 'gen', label: 'Gender' }],
  },
  {
    domainKey: 'comor', subDomain: 'comor', label: 'Comorbidity', shortLabel: 'Comorbid', icon: '\u2764\uFE0F', color: '#ef4444',
    note: 'Severity weight per condition (sum = 100)',
    items: [
      { key: 'htn', label: 'Hypertension' }, { key: 'dm', label: 'Diabetes' },
      { key: 'oa', label: 'Osteoarthritis' }, { key: 'osteo', label: 'Osteoporosis' },
      { key: 'inj', label: 'Prior Injury' }, { key: 'surg', label: 'Prior Surgery' },
      { key: 'thyr', label: 'Thyroid' },
    ],
  },
  {
    domainKey: 'life', subDomain: 'life', label: 'Lifestyle', shortLabel: 'Life', icon: '\u{1F3C3}', color: '#94a3b8',
    note: 'Injury/surgery + planned fields (sum = 100)',
    items: [
      { key: 'lifeinj', label: 'Injury History', section: 'From Dataset' },
      { key: 'lifesurg', label: 'Surgery History' },
      { key: 'smoke', label: 'Smoking', section: 'Per Patient' },
      { key: 'alcohol', label: 'Alcohol' }, { key: 'sitting', label: 'Sitting >5h' },
      { key: 'standing', label: 'Standing >5h' },
    ],
  },
];

function SubWeightRow({ domain, itemKey, label, color }: {
  domain: keyof AllSubWeights; itemKey: string; label: string; color: string;
}) {
  const { SW, updateSubWeight } = useRPI();
  const domainObj = SW[domain] as unknown as Record<string, number>;
  const value = domainObj[itemKey] ?? 0;

  const handleChange = useCallback((val: number) => {
    updateSubWeight(domain, itemKey, Math.round(val));
  }, [domain, itemKey, updateSubWeight]);

  return (
    <View style={styles.subRow}>
      <Text style={[styles.subLabel, { color }]} numberOfLines={1}>{label}</Text>
      <View style={styles.subSliderWrap}>
        <Slider value={value} min={0} max={90} onValueChange={handleChange} trackColor={color} />
      </View>
      <Text style={styles.subValue}>{value}</Text>
    </View>
  );
}

const MemoSubWeightRow = React.memo(SubWeightRow);

function DomainRow({ config, expanded, onToggle }: {
  config: DomainConfig; expanded: boolean; onToggle: () => void;
}) {
  const { W, updateWeight, SW } = useRPI();
  const value = W[config.domainKey];
  const domainObj = SW[config.subDomain] as unknown as Record<string, number>;
  const subTotal = Object.values(domainObj).reduce((s, v) => s + v, 0);

  const handleWeightChange = useCallback((val: number) => {
    updateWeight(config.domainKey, Math.round(val));
  }, [config.domainKey, updateWeight]);

  let currentSection = '';

  return (
    <View style={[styles.domainCard, expanded && styles.domainCardExpanded, { borderLeftColor: config.color }]}>
      <TouchableOpacity style={styles.domainHeader} onPress={onToggle} activeOpacity={0.6}>
        <View style={styles.domainHeaderLeft}>
          <Text style={styles.domainIcon}>{config.icon}</Text>
          <Text style={[styles.domainLabel, { color: config.color }]}>{config.label}</Text>
        </View>
        <View style={styles.domainHeaderRight}>
          <Text style={[styles.domainValue, { color: config.color }]}>{value}%</Text>
          {expanded
            ? <ChevronUp size={16} color={config.color} />
            : <ChevronRight size={16} color="#475569" />
          }
        </View>
      </TouchableOpacity>

      <View style={styles.domainSliderRow}>
        <Slider value={value} min={0} max={98} onValueChange={handleWeightChange} trackColor={config.color} />
      </View>

      {expanded && (
        <View style={styles.subPanel}>
          <View style={styles.subPanelHeader}>
            <Text style={styles.subPanelTitle}>{config.note}</Text>
            <View style={[styles.subTotalBadge, { borderColor: subTotal === 100 ? '#166534' : '#991b1b' }]}>
              <Text style={[styles.subTotalText, { color: subTotal === 100 ? '#4ade80' : '#f87171' }]}>
                Σ {subTotal}
              </Text>
            </View>
          </View>
          {config.items.map((item) => {
            const showSection = item.section && item.section !== currentSection;
            if (item.section) currentSection = item.section;
            return (
              <View key={item.key}>
                {showSection && (
                  <Text style={[styles.sectionDivider, { color: config.color }]}>{item.section}</Text>
                )}
                <MemoSubWeightRow
                  domain={config.subDomain}
                  itemKey={item.key}
                  label={item.label}
                  color={config.color}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const MemoDomainRow = React.memo(DomainRow);

function WeightControlsInner() {
  const {
    weightTotal,
    tga,
    setTGA,
    tar,
    setTAR,
    saveScenario,
    W,
    updateWeight,
    optimizing,
    optProgress,
  } = useRPI();
  const [panelOpen, setPanelOpen] = useState<boolean>(true);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [saveFlash, setSaveFlash] = useState<boolean>(false);

  const total = weightTotal;

  const handleSave = useCallback(() => {
    saveScenario();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }, [saveScenario]);

  const handlePanelToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPanelOpen((p) => !p);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleDomainToggle = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDomain((prev) => (prev === key ? null : key));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={handlePanelToggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <SlidersHorizontal size={16} color={Colors.bluePale} />
          <Text style={styles.headerTitle}>Weights</Text>
          <View style={[styles.totalBadge, { borderColor: total === 100 ? Colors.greenLight : Colors.red }]}>
            <Text style={[styles.totalText, { color: total === 100 ? Colors.greenLight : Colors.red }]}>{total}%</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.saveBtn, saveFlash && styles.saveBtnFlash]}
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Save size={13} color={saveFlash ? Colors.greenLight : Colors.bluePale} />
            <Text style={[styles.saveBtnText, saveFlash && styles.saveBtnTextFlash]}>
              {saveFlash ? 'Saved!' : 'Save'}
            </Text>
          </TouchableOpacity>
          {panelOpen ? <ChevronUp size={18} color={Colors.bluePale} /> : <ChevronDown size={18} color={Colors.bluePale} />}
        </View>
      </TouchableOpacity>

      {optimizing && (
        <View style={styles.progressBanner}>
          <ActivityIndicator size="small" color="#fbbf24" />
          <Text style={styles.progressText}>{optProgress}</Text>
        </View>
      )}

      {panelOpen && total !== 100 && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={14} color="#fbbf24" />
          <Text style={styles.warningText}>
            Weights total {total}% — does not equal 100%. Results will be proportionally normalized but may not reflect intended distribution.
          </Text>
        </View>
      )}

      {panelOpen && (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {DOMAINS.map((d) => (
            <MemoDomainRow
              key={d.domainKey}
              config={d}
              expanded={expandedDomain === d.domainKey}
              onToggle={() => handleDomainToggle(d.domainKey)}
            />
          ))}

          <View style={styles.thresholdSection}>
            <Text style={styles.thresholdTitle}>THRESHOLDS</Text>
            <View style={styles.thresholdRow}>
              <View style={styles.thresholdItem}>
                <Text style={[styles.thresholdLabel, { color: '#4ade80' }]}>G→A</Text>
                <TextInput
                  style={[styles.thresholdInput, { borderColor: '#166534' }]}
                  value={String(tga)}
                  keyboardType="numeric"
                  onChangeText={(t) => setTGA(parseInt(t) || 35)}
                />
              </View>
              <View style={styles.thresholdItem}>
                <Text style={[styles.thresholdLabel, { color: '#fbbf24' }]}>A→R</Text>
                <TextInput
                  style={[styles.thresholdInput, { borderColor: '#854d0e' }]}
                  value={String(tar)}
                  keyboardType="numeric"
                  onChangeText={(t) => setTAR(parseInt(t) || 55)}
                />
              </View>
              <View style={styles.totalDisplay}>
                <Text style={styles.totalDisplayLabel}>Total</Text>
                <Text style={[styles.totalDisplayValue, { color: total === 100 ? '#4ade80' : '#f87171' }]}>{total}%</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

    </View>
  );
}

export const WeightControls = React.memo(WeightControlsInner);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a1228',
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: Colors.bluePale,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalBadge: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  totalText: {
    fontSize: 13,
    fontWeight: '900',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#2d5f9e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  saveBtnFlash: {
    backgroundColor: '#14532d',
    borderColor: '#166534',
  },
  saveBtnText: {
    color: Colors.bluePale,
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtnTextFlash: {
    color: Colors.greenLight,
  },
  optimaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#451a03',
    borderWidth: 1,
    borderColor: '#92400e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  optimaBtnDisabled: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  optimaBtnText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
  optimaBtnTextDisabled: {
    color: '#64748b',
  },
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#451a03',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#92400e',
  },
  progressText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fbbf24',
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  weightsSection: {
    marginBottom: 20,
  },
  weightsComparison: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weightsColumn: {
    flex: 1,
  },
  columnTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  thresholdRowModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 4,
    paddingTop: 6,
  },
  weightLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  weightValue: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  weightValueChanged: {
    color: '#fbbf24',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1,
    backgroundColor: '#92400e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    maxHeight: 520,
  },
  bodyContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 6,
  },
  domainCard: {
    backgroundColor: '#0d1835',
    borderWidth: 1,
    borderColor: '#1a2d50',
    borderLeftWidth: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  domainCardExpanded: {
    borderColor: '#2d5f9e',
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  domainHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  domainIcon: {
    fontSize: 14,
  },
  domainLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  domainHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  domainValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  domainSliderRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  subPanel: {
    backgroundColor: '#060e1e',
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  subPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subPanelTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
  },
  subTotalBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  subTotalText: {
    fontSize: 11,
    fontWeight: '900',
  },
  sectionDivider: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 6,
    marginBottom: 4,
    opacity: 0.7,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  subLabel: {
    width: 110,
    fontSize: 11,
    fontWeight: '600',
  },
  subSliderWrap: {
    flex: 1,
    minWidth: 70,
  },
  subValue: {
    width: 28,
    textAlign: 'right' as const,
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
  },
  thresholdSection: {
    backgroundColor: '#0d1835',
    borderWidth: 1,
    borderColor: '#1a2d50',
    borderRadius: 8,
    padding: 12,
  },
  thresholdTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  thresholdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thresholdLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  thresholdInput: {
    width: 54,
    backgroundColor: '#060e1e',
    borderWidth: 1,
    borderColor: '#1e4a7f',
    color: '#fff',
    padding: 6,
    borderRadius: 4,
    fontSize: 15,
    textAlign: 'center' as const,
    fontWeight: '700' as const,
  },
  totalDisplay: {
    marginLeft: 'auto',
    alignItems: 'center',
  },
  totalDisplayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalDisplayValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#422006',
    borderBottomWidth: 1,
    borderBottomColor: '#854d0e',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#fbbf24',
    lineHeight: 16,
  },
});
