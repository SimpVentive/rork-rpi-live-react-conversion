import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const toggle = useCallback(() => setOpen((p) => !p), []);

  return (
    <View style={secStyles.container}>
      <TouchableOpacity style={secStyles.header} onPress={toggle} activeOpacity={0.7}>
        <Text style={secStyles.title}>{title}</Text>
        {open ? <ChevronUp size={18} color={Colors.blue} /> : <ChevronDown size={18} color={Colors.textMuted} />}
      </TouchableOpacity>
      {open && <View style={secStyles.body}>{children}</View>}
    </View>
  );
}

const secStyles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 15, fontWeight: '800', color: '#1e40af', flex: 1, marginRight: 8 },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
});

function InfoBox({ children }: { children: string }) {
  return (
    <View style={ibStyles.box}>
      <Text style={ibStyles.text}>{children}</Text>
    </View>
  );
}

const ibStyles = StyleSheet.create({
  box: { backgroundColor: '#eff6ff', borderLeftWidth: 4, borderLeftColor: '#3b82f6', padding: 14, borderTopRightRadius: 8, borderBottomRightRadius: 8, marginVertical: 10 },
  text: { fontSize: 14, color: '#334155', lineHeight: 22 },
});

function TableRow({ cells, isHeader = false }: { cells: string[]; isHeader?: boolean }) {
  return (
    <View style={[trStyles.row, isHeader && trStyles.headerRow]}>
      {cells.map((c, i) => (
        <Text key={i} style={[trStyles.cell, isHeader && trStyles.headerCell, i === 0 && trStyles.firstCell]} numberOfLines={3}>
          {c}
        </Text>
      ))}
    </View>
  );
}

const trStyles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerRow: { backgroundColor: '#f1f5f9', borderBottomWidth: 2, borderBottomColor: '#e2e8f0' },
  cell: { flex: 1, paddingHorizontal: 8, paddingVertical: 8, fontSize: 13, color: '#334155' },
  headerCell: { fontWeight: '700', color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  firstCell: { fontWeight: '600' },
});

function HBar({ label, value, maxVal, color }: { label: string; value: number; maxVal: number; color: string }) {
  const pct = maxVal > 0 ? Math.min(100, Math.round(value / maxVal * 100)) : 0;
  return (
    <View style={hbStyles.row}>
      <Text style={hbStyles.label}>{label}</Text>
      <View style={hbStyles.track}>
        <View style={[hbStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[hbStyles.value, { color }]}>{value}pt{value !== 1 ? 's' : ''}</Text>
    </View>
  );
}

const hbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  label: { width: 100, fontSize: 13, color: '#334155' },
  track: { flex: 1, height: 14, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 14, borderRadius: 4 },
  value: { width: 50, fontSize: 13, fontWeight: '800', textAlign: 'right' },
});

export default function HelpScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <BookOpen size={20} color={Colors.textWhite} />
        <Text style={styles.topTitle}>Help & Guide</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        <Section title="1. What is RPI Live?" defaultOpen>
          <Text style={styles.body}>
            RPI Live is a weighted multi-domain clinical scoring dashboard for chronic low back pain (cLBP) prognosis. It combines six clinical domains into a single Relational Prognosis Index (RPI) score from 0 to 100. Higher score = worse predicted outcome.
          </Text>
          <Text style={styles.body}>
            Built on 148 patients across 4 sites (KIMS Secunderabad, Kues, Abhis, SDD). Validated against clinician-assigned manual risk classifications (Low / Moderate / High).
          </Text>
          <InfoBox>
            Formula: RPI = (w1 x STarT + w2 x ROM + w3 x Physio + w4 x Anthro + w5 x Comorbid + w6 x Lifestyle). Each domain score is 0-100. Weights always sum to exactly 100%.
          </InfoBox>
        </Section>

        <Section title="2. How RPI is Computed">
          <TableRow cells={['Step', 'Domain', 'Weight', 'Input']} isHeader />
          <TableRow cells={['1', 'STarT Back', '35%', 'Score 0-9']} />
          <TableRow cells={['2', 'VR ROM', '25%', 'Pain 0-10 x4']} />
          <TableRow cells={['3', 'Physio', '15%', '10 findings']} />
          <TableRow cells={['4', 'Anthropo', '12%', 'Age + Gender']} />
          <TableRow cells={['5', 'Comorbid', '8%', '7 conditions']} />
          <TableRow cells={['6', 'Lifestyle', '5%', 'Injury + Surg']} />
        </Section>

        <Section title="3. Anthropometric Domain (12%)">
          <Text style={styles.body}>
            Two constituent sub-factors combined via Age:Gender split slider (default 70% age, 30% gender).
          </Text>
          <Text style={styles.subTitle}>Age Score (0-5 points)</Text>
          <HBar label="<30 years" value={0} maxVal={5} color="#22c55e" />
          <HBar label="30-39 years" value={1} maxVal={5} color="#65a30d" />
          <HBar label="40-49 years" value={2} maxVal={5} color="#ca8a04" />
          <HBar label="50-59 years" value={3} maxVal={5} color="#ea580c" />
          <HBar label="60-69 years" value={4} maxVal={5} color="#dc2626" />
          <HBar label="70+ years" value={5} maxVal={5} color="#7f1d1d" />

          <Text style={[styles.subTitle, { marginTop: 12 }]}>Gender Score</Text>
          <HBar label="Male" value={0} maxVal={2} color="#3b82f6" />
          <HBar label="Female" value={2} maxVal={2} color="#ec4899" />

          <InfoBox>
            Domain score = (Age-Split x Age_pts/5 + Gender-Split x Gender_pts/2) x 100. Example: 45yr female (split=70/30): (0.7x2/5 + 0.3x2/2)x100 = 58
          </InfoBox>
        </Section>

        <Section title="4. Comorbidity Domain (8%)">
          <Text style={styles.body}>
            Seven conditions with sub-weights. Each binary (0/1) except thyroid (0.5).
          </Text>
          <HBar label="HTN" value={1} maxVal={5} color="#f87171" />
          <HBar label="Diabetes" value={1} maxVal={5} color="#f87171" />
          <HBar label="OA" value={1} maxVal={5} color="#f87171" />
          <HBar label="Osteoporosis" value={1} maxVal={5} color="#f87171" />
          <HBar label="Prior Injury" value={1} maxVal={5} color="#fb923c" />
          <HBar label="Prior Surgery" value={1} maxVal={5} color="#fb923c" />
          <HBar label="Thyroid" value={0} maxVal={5} color="#facc15" />
          <InfoBox>Domain score = total_pts / 5 x 100. HTN + DM + OA = 3 pts = score 60. Capped at 100.</InfoBox>
        </Section>

        <Section title="5. VR ROM / Pain Scale (25%)">
          <Text style={styles.body}>
            Pain experienced during 4-directional ROM via 0-10 visual pain scale captured by VR headset.
          </Text>
          <TableRow cells={['Direction', 'Scale', '0 = No pain', '10 = Max']} isHeader />
          <TableRow cells={['Flexion', '0-10', 'Pain-free', 'Severe']} />
          <TableRow cells={['Extension', '0-10', 'Pain-free', 'Severe']} />
          <TableRow cells={['Left Rot', '0-10', 'Pain-free', 'Severe']} />
          <TableRow cells={['Right Rot', '0-10', 'Pain-free', 'Severe']} />
          <InfoBox>Domain score = avg(flex, ext, lrot, rrot) / 10 x 100. Scores 5,4,3,4 → avg 4.0 → score 40.</InfoBox>
        </Section>

        <Section title="6. STarT Back Tool (35%)">
          <Text style={styles.body}>
            Validated 9-item psychosocial risk questionnaire. Highest-weighted because psychosocial factors are strongest predictors of poor cLBP prognosis.
          </Text>
          <HBar label="Low (0-3)" value={3} maxVal={9} color="#22c55e" />
          <HBar label="Moderate (4-5)" value={5} maxVal={9} color="#f59e0b" />
          <HBar label="High (6-9)" value={9} maxVal={9} color="#ef4444" />
          <InfoBox>Domain score = STarT_score / 9 x 100. Score 7 = 78/100.</InfoBox>
        </Section>

        <Section title="7. Physio Examination (15%)">
          <Text style={styles.body}>
            10 binary indicators: 6 special tests (FABER, FAIR, SLR bilateral) + 4 exam findings (hyperextension pain, tenderness, tightness, muscle knots).
          </Text>
          <InfoBox>Domain score = positive_signs / 10 x 100. 4 signs = score 40.</InfoBox>
        </Section>

        <Section title="8. Lifestyle Domain (5%)">
          <Text style={styles.body}>
            Proxy measure using injury and surgery history. Per-patient lifestyle entries (smoking, alcohol, ergonomics) can be added in Inferences tab.
          </Text>
          <InfoBox>Duration adds weight: less than 1yr = 0.25pt, 1-5yr = 0.5pt, 5-10yr = 0.75pt, greater than 10yr = 1pt extra.</InfoBox>
        </Section>

        <Section title="9. RAG Classification">
          <TableRow cells={['Tier', 'Range', 'Action']} isHeader />
          <TableRow cells={['Green', '0-34', 'Standard VR rehab; monitor']} />
          <TableRow cells={['Amber', '35-54', 'Structured physio + VR']} />
          <TableRow cells={['Red', '55-100', 'Immediate clinical review']} />
          <InfoBox>Adjust thresholds using G→A and A→R in Weight Controls. Lowering Red threshold increases Sensitivity at cost of Precision.</InfoBox>
        </Section>

        <Section title="10. Metrics Glossary">
          <TableRow cells={['Metric', 'Formula', 'Target']} isHeader />
          <TableRow cells={['Sensitivity', 'High flagged Red / All High', '≥70%']} />
          <TableRow cells={['Precision', 'True High in Red / All Red', '≥70%']} />
          <TableRow cells={['Accuracy', 'Concordant / All classified', '≥75%']} />
          <TableRow cells={['MISS rate', 'High classified Green', '=0%']} />
          <TableRow cells={['Delta H-L', 'Avg(High) - Avg(Low)', 'Higher better']} />
        </Section>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  scroll: {
    flex: 1,
  },
  body: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 4,
  },
});
