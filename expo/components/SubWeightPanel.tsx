import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRPI } from '@/contexts/RPIContext';
import Slider from '@/components/Slider';
import Colors from '@/constants/colors';
import { AllSubWeights } from '@/data/types';
import * as Haptics from 'expo-haptics';

interface SubWeightItem {
  key: string;
  label: string;
  section?: string;
}

interface SubWeightGroupProps {
  domain: keyof AllSubWeights;
  title: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeColor: string;
  items: SubWeightItem[];
  note: string;
}

const SUB_WEIGHT_GROUPS: SubWeightGroupProps[] = [
  {
    domain: 'start',
    title: 'STarT Back',
    icon: '\u{1F4CB}',
    color: '#60a5fa',
    badgeBg: 'rgba(59,130,246,.15)',
    badgeColor: '#93c5fd',
    note: '9 psychosocial items — assign relative importance (sum = 100)',
    items: [
      { key: 's1', label: 'Pain Bothersome' },
      { key: 's2', label: 'Leg Pain (ref)' },
      { key: 's3', label: 'Body Spread Pain' },
      { key: 's4', label: 'Catastrophizing' },
      { key: 's5', label: 'Anxiety' },
      { key: 's6', label: 'Depression' },
      { key: 's7', label: 'Walking Difficulty' },
      { key: 's8', label: 'Dressing Difficulty' },
      { key: 's9', label: 'Overall Fear' },
    ],
  },
  {
    domain: 'rom',
    title: 'VR ROM',
    icon: '\u{1F3A5}',
    color: '#22c55e',
    badgeBg: 'rgba(34,197,94,.1)',
    badgeColor: '#4ade80',
    note: '4 directions of range-of-motion pain (sum = 100)',
    items: [
      { key: 'flex', label: 'Flexion' },
      { key: 'ext', label: 'Extension' },
      { key: 'lrot', label: 'Left Rotation' },
      { key: 'rrot', label: 'Right Rotation' },
    ],
  },
  {
    domain: 'physio',
    title: 'Physio',
    icon: '\u{1F9D1}\u200D\u2695\uFE0F',
    color: '#a78bfa',
    badgeBg: 'rgba(167,139,250,.1)',
    badgeColor: '#c4b5fd',
    note: '6 special tests + 4 exam findings (sum = 100)',
    items: [
      { key: 'fabl', label: 'FABER L', section: 'Special Tests' },
      { key: 'fairl', label: 'FAIR L' },
      { key: 'slrl', label: 'SLR L' },
      { key: 'fabr', label: 'FABER R' },
      { key: 'fairr', label: 'FAIR R' },
      { key: 'slrr', label: 'SLR R' },
      { key: 'hyp', label: 'Hyperext Pain', section: 'Exam Findings' },
      { key: 'tend', label: 'Tenderness' },
      { key: 'tight', label: 'Tightness' },
      { key: 'knots', label: 'Muscle Knots' },
    ],
  },
  {
    domain: 'anthro',
    title: 'Anthropo',
    icon: '\u{1F464}',
    color: '#f59e0b',
    badgeBg: 'rgba(245,158,11,.1)',
    badgeColor: '#fcd34d',
    note: 'Age band vs Gender risk contribution (sum = 100)',
    items: [
      { key: 'age', label: 'Age Band' },
      { key: 'gen', label: 'Gender' },
    ],
  },
  {
    domain: 'comor',
    title: 'Comorbidity',
    icon: '\u2764\uFE0F',
    color: '#ef4444',
    badgeBg: 'rgba(239,68,68,.1)',
    badgeColor: '#fca5a5',
    note: 'Relative severity weight per condition (sum = 100)',
    items: [
      { key: 'htn', label: 'Hypertension' },
      { key: 'dm', label: 'Diabetes' },
      { key: 'oa', label: 'Osteoarthritis' },
      { key: 'osteo', label: 'Osteoporosis' },
      { key: 'inj', label: 'Prior Injury' },
      { key: 'surg', label: 'Prior Surgery' },
      { key: 'thyr', label: 'Thyroid' },
    ],
  },
  {
    domain: 'life',
    title: 'Lifestyle',
    icon: '\u{1F3C3}',
    color: '#94a3b8',
    badgeBg: 'rgba(148,163,184,.1)',
    badgeColor: '#cbd5e1',
    note: 'Injury/surgery from data + planned lifestyle fields (sum = 100)',
    items: [
      { key: 'lifeinj', label: 'Injury History', section: 'From Dataset' },
      { key: 'lifesurg', label: 'Surgery History' },
      { key: 'smoke', label: 'Smoking', section: 'Per Patient Entry' },
      { key: 'alcohol', label: 'Alcohol' },
      { key: 'sitting', label: 'Sitting >5h' },
      { key: 'standing', label: 'Standing >5h' },
    ],
  },
];

function SubWeightRow({ domain, itemKey, label, color }: {
  domain: keyof AllSubWeights;
  itemKey: string;
  label: string;
  color: string;
}) {
  const { SW, updateSubWeight } = useRPI();
  const domainObj = SW[domain] as unknown as Record<string, number>;
  const value = domainObj[itemKey] ?? 0;

  const handleChange = useCallback((val: number) => {
    updateSubWeight(domain, itemKey, Math.round(val));
  }, [domain, itemKey, updateSubWeight]);

  return (
    <View style={styles.swRow}>
      <Text style={styles.swLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.swSliderWrap}>
        <Slider value={value} min={0} max={90} onValueChange={handleChange} trackColor={color} />
      </View>
      <Text style={styles.swValue}>{value}</Text>
    </View>
  );
}

const MemoSubWeightRow = React.memo(SubWeightRow);

function SubWeightGroupCard({ group }: { group: SubWeightGroupProps }) {
  const { SW, W } = useRPI();
  const domainObj = SW[group.domain] as unknown as Record<string, number>;
  const total = Object.values(domainObj).reduce((s, v) => s + v, 0);
  const groupWeight = W[group.domain as keyof typeof W];

  let currentSection = '';

  return (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <Text style={[styles.groupTitle, { color: group.color }]}>
          {group.icon} {group.title}
        </Text>
        <View style={[styles.groupBadge, { backgroundColor: group.badgeBg }]}>
          <Text style={[styles.groupBadgeText, { color: group.badgeColor }]}>
            wt {groupWeight}%
          </Text>
        </View>
      </View>
      <Text style={styles.groupNote}>{group.note}</Text>
      {group.items.map((item) => {
        const showSection = item.section && item.section !== currentSection;
        if (item.section) currentSection = item.section;
        return (
          <View key={item.key}>
            {showSection && (
              <Text style={[styles.sectionLabel, { color: group.color }]}>{item.section}</Text>
            )}
            <MemoSubWeightRow
              domain={group.domain}
              itemKey={item.key}
              label={item.label}
              color={group.color}
            />
          </View>
        );
      })}
      <View style={styles.groupTotal}>
        <Text style={styles.groupTotalLabel}>Sub-total:</Text>
        <Text style={[styles.groupTotalValue, { color: total === 100 ? Colors.greenLight : Colors.red }]}>
          {total}
        </Text>
      </View>
    </View>
  );
}

const MemoSubWeightGroupCard = React.memo(SubWeightGroupCard);

function SubWeightPanelInner() {
  const [expanded, setExpanded] = useState<boolean>(false);

  const handleToggle = useCallback(() => {
    setExpanded((p) => !p);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.toggleBtn} onPress={handleToggle} activeOpacity={0.7}>
        <View style={styles.toggleLeft}>
          {expanded ? <ChevronUp size={14} color={Colors.bluePale} /> : <ChevronDown size={14} color={Colors.bluePale} />}
          <Text style={styles.toggleText}>Sub-Weights</Text>
        </View>
        <Text style={styles.toggleHint}>
          {expanded ? 'Tap to collapse' : 'Adjust individual sub-factor weights within each domain'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.panelBody}>
          {SUB_WEIGHT_GROUPS.map((group) => (
            <MemoSubWeightGroupCard key={group.domain} group={group} />
          ))}
        </View>
      )}
    </View>
  );
}

export const SubWeightPanel = React.memo(SubWeightPanelInner);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#060e1e',
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.bluePale,
  },
  toggleHint: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  panelBody: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 12,
  },
  groupCard: {
    backgroundColor: '#0d1835',
    borderWidth: 1,
    borderColor: '#2d5f9e',
    borderRadius: 10,
    padding: 14,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  groupNote: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 10,
    lineHeight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.8,
  },
  swRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  swLabel: {
    width: 120,
    fontSize: 12,
    color: Colors.bluePale,
    fontWeight: '600',
  },
  swSliderWrap: {
    flex: 1,
    minWidth: 80,
  },
  swValue: {
    width: 32,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textWhite,
  },
  groupTotal: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupTotalLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  groupTotalValue: {
    fontSize: 15,
    fontWeight: '900',
  },
});
