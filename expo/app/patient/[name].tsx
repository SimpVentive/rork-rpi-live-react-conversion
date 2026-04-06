import React, { useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, User, Activity, Heart, Brain, Bone, Dumbbell, AlertTriangle, Edit3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRPI } from '@/contexts/RPIContext';
import Colors from '@/constants/colors';
import {
  sSTarT, sROM, sPhysio, sAnthropo, sComor, sLife,
  tierColor, riskColor, riskLabel, getMatchType, sAge,
} from '@/data/scoring';

function DomainBar({ label, score, icon, weight, disabled }: { label: string; score: number; icon: React.ReactNode; weight: number; disabled?: boolean }) {
  const color = score >= 60 ? Colors.red : score >= 35 ? Colors.amber : Colors.green;
  return (
    <View style={[dbStyles.row, disabled && dbStyles.disabledRow]}>
      <View style={dbStyles.iconWrap}>{icon}</View>
      <View style={dbStyles.info}>
        <View style={dbStyles.labelRow}>
          <Text style={[dbStyles.label, disabled && dbStyles.disabledText]}>{label}</Text>
          <Text style={[dbStyles.weight, disabled && dbStyles.disabledText]}>wt:{weight}%</Text>
          <Text style={[dbStyles.score, { color }, disabled && dbStyles.disabledText]}>{score}</Text>
        </View>
        <View style={dbStyles.track}>
          <View style={[dbStyles.fill, { width: `${Math.min(100, score)}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

const dbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconWrap: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', flex: 1 },
  weight: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  score: { fontSize: 16, fontWeight: '900', minWidth: 30, textAlign: 'right' },
  track: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  disabledRow: { opacity: 0.5 },
  disabledText: { color: '#94a3b8' },
});

function SubFactorRow({ domain, name, val, max }: { domain: string; name: string; val: number; max: number }) {
  const pct = max > 0 ? Math.round(val / max * 100) : 0;
  const fc = pct >= 80 ? Colors.red : pct >= 50 ? Colors.amber : Colors.green;
  return (
    <View style={sfStyles.row}>
      <Text style={sfStyles.domain}>{domain}</Text>
      <Text style={sfStyles.name}>{name}</Text>
      <Text style={sfStyles.val}>{val}/{max}</Text>
      <View style={sfStyles.bar}>
        <View style={[sfStyles.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: fc }]} />
      </View>
      <Text style={[sfStyles.flag, { color: fc }]}>{pct >= 80 ? 'HIGH' : pct >= 50 ? 'MOD' : 'OK'}</Text>
    </View>
  );
}

const sfStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  domain: { width: 58, fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  name: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e293b' },
  val: { width: 38, fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  bar: { width: 50, height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginHorizontal: 6 },
  barFill: { height: 5, borderRadius: 3 },
  flag: { width: 34, fontSize: 10, fontWeight: '700', textAlign: 'right' },
});

export default function PatientDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name: encodedName } = useLocalSearchParams<{ name: string }>();
  const patientName = decodeURIComponent(encodedName || '');
  const { results, SW, W, getLifeOverride, tga, tar, getDisplayName, setManualClassification, manualOverrides, isPhysioNotPerformed, setPhysioNotPerformed } = useRPI();

  const patient = useMemo(
    () => results.find((r) => r.name === patientName) ?? null,
    [results, patientName],
  );

  const physioNotPerformed = useMemo(
    () => (patient ? isPhysioNotPerformed(patient.name) : false),
    [patient, isPhysioNotPerformed],
  );

  const domains = useMemo(() => {
    if (!patient) return null;
    return {
      start: sSTarT(patient),
      rom: sROM(patient, SW),
      physio: sPhysio(patient, SW),
      anthro: sAnthropo(patient, SW),
      comor: sComor(patient, SW),
      life: sLife(patient, SW, getLifeOverride(patient.name)),
    };
  }, [patient, SW, getLifeOverride]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  if (!patient) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.errorWrap}>
          <AlertTriangle size={40} color={Colors.amber} />
          <Text style={styles.errorText}>Patient not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={handleClose}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tc = tierColor(patient.tier);
  const rc = riskColor(patient.sr);
  const matchType = getMatchType(patient.sr, patient.tier);
  const matchColor = matchType === 'Concordant' ? Colors.greenDark : matchType === 'Partial' ? Colors.amberDark : matchType === 'Discordant' ? Colors.redDark : Colors.textMuted;
  const totalW = W.start + W.rom + W.physio + W.anthro + W.comor + W.life;
  const agePts = sAge(patient.age);
  const ageBand = patient.age < 30 ? '<30' : patient.age < 40 ? '30-39' : patient.age < 50 ? '40-49' : patient.age < 60 ? '50-59' : patient.age < 70 ? '60-69' : '70+';

  const issues: string[] = [];
  if (domains) {
    if (domains.start >= 60) issues.push(`High STarT (${patient.start}/9)`);
    if (domains.rom >= 60) issues.push(`Restricted ROM`);
    if (domains.physio >= 50) issues.push(`Multiple physio signs`);
    if (domains.anthro >= 60) issues.push(`Age-gender profile (${patient.age}yr ${patient.g === 'F' ? 'F' : 'M'})`);
    if (domains.comor >= 40) issues.push(`Comorbidity burden`);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.modalHeader}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeaderRow}>
          <Text style={styles.modalTitle} numberOfLines={1}>{getDisplayName(patient.name)}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={[styles.rpiCircle, { borderColor: tc }]}>
            <Text style={[styles.rpiValue, { color: tc }]}>{patient.rpi}</Text>
            <Text style={styles.rpiLabel}>RPI</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroMeta}>{patient.age}yr · {patient.g === 'F' ? 'Female' : 'Male'} · {patient.site}</Text>
            <View style={styles.heroTags}>
              <View style={[styles.tierTag, { backgroundColor: tc + '18', borderColor: tc }]}>
                <Text style={[styles.tierTagText, { color: tc }]}>{patient.tier}</Text>
              </View>
              <Text style={[styles.manualText, { color: rc }]}>Manual: {riskLabel(patient.sr)}</Text>
            </View>
            {matchType && (
              <View style={[styles.matchBadge, { backgroundColor: matchColor + '15', borderColor: matchColor + '40' }]}>
                <Text style={[styles.matchBadgeText, { color: matchColor }]}>{matchType}</Text>
              </View>
            )}
          </View>
        </View>

        {matchType && matchType !== 'Concordant' && (
          <View style={styles.alertCard}>
            <AlertTriangle size={16} color={matchType === 'Discordant' ? Colors.redDark : Colors.amberDark} />
            <Text style={styles.alertText}>
              Clinician classified as {riskLabel(patient.sr)}, RPI assigns {patient.tier}.
              {matchType === 'Discordant' ? ' Review weights or thresholds.' : ''}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.manualHeader}>
            <Edit3 size={14} color="#1e40af" />
            <Text style={styles.cardTitle}>Manual Risk Classification</Text>
          </View>
          <Text style={styles.manualHint}>Set by clinician — used for concordance analysis and AI training</Text>
          <View style={styles.riskButtons}>
            {(['H', 'M', 'L', 'U'] as const).map((risk) => {
              const isActive = patient.sr === risk;
              const _isOverridden = manualOverrides[patient.name] !== undefined;
              const btnColor = risk === 'H' ? '#dc2626' : risk === 'M' ? '#b45309' : risk === 'L' ? '#15803d' : '#64748b';
              return (
                <TouchableOpacity
                  key={risk}
                  style={[
                    styles.riskBtn,
                    { borderColor: btnColor + (isActive ? 'ff' : '40') },
                    isActive && { backgroundColor: btnColor + '15' },
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setManualClassification(patient.name, risk);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.riskDot, { backgroundColor: isActive ? btnColor : btnColor + '40' }]} />
                  <Text style={[styles.riskBtnText, { color: isActive ? btnColor : btnColor + '90' }]}>
                    {riskLabel(risk)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {manualOverrides[patient.name] !== undefined && (
            <View style={styles.overrideNote}>
              <Text style={styles.overrideNoteText}>Overridden from original dataset value</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Domain Activation Profile</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Physio assessment not performed</Text>
            <Switch
              value={physioNotPerformed}
              onValueChange={(value) => setPhysioNotPerformed(patient.name, value)}
              trackColor={{ false: '#94a3b8', true: Colors.bluePale }}
              thumbColor={physioNotPerformed ? Colors.blue : Colors.textMuted}
              style={styles.toggleSwitch}
            />
          </View>
          {domains && (
            <>
              <DomainBar label="STarT Back" score={domains.start} weight={W.start} icon={<Brain size={16} color={Colors.blue} />} />
              <DomainBar label="VR ROM" score={domains.rom} weight={W.rom} icon={<Activity size={16} color={Colors.green} />} />
              <DomainBar
                label="Physio"
                score={domains.physio}
                weight={W.physio}
                icon={<Dumbbell size={16} color={Colors.purple} />}
                disabled={physioNotPerformed}
              />
              <DomainBar label="Anthropo" score={domains.anthro} weight={W.anthro} icon={<User size={16} color={Colors.amber} />} />
              <DomainBar label="Comorbid" score={domains.comor} weight={W.comor} icon={<Heart size={16} color={Colors.red} />} />
              <DomainBar label="Lifestyle" score={domains.life} weight={W.life} icon={<Bone size={16} color={Colors.textMuted} />} />
            </>
          )}
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: Colors.red }]} />
            <Text style={styles.legendText}>≥60</Text>
            <View style={[styles.legendDot, { backgroundColor: Colors.amber }]} />
            <Text style={styles.legendText}>≥35</Text>
            <View style={[styles.legendDot, { backgroundColor: Colors.green }]} />
            <Text style={styles.legendText}>&lt;35</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>RPI vs Manual Classification</Text>
          <View style={styles.compRow}>
            <Text style={[styles.compLabel, { color: tc }]}>RPI</Text>
            <View style={styles.compBarWrap}>
              <View style={[styles.compBar, { width: `${Math.min(100, patient.rpi)}%`, backgroundColor: tc }]}>
                <Text style={styles.compBarText}>{patient.rpi}</Text>
              </View>
            </View>
            <Text style={[styles.compVal, { color: tc }]}>{patient.tier}</Text>
          </View>
          {patient.sr !== 'U' && (
            <View style={styles.compRow}>
              <Text style={[styles.compLabel, { color: rc }]}>Manual</Text>
              <View style={styles.compBarWrap}>
                <View style={[styles.compBar, {
                  width: `${patient.sr === 'H' ? 90 : patient.sr === 'M' ? 50 : 15}%`,
                  backgroundColor: rc,
                  opacity: 0.85,
                }]}>
                  <Text style={styles.compBarText}>{riskLabel(patient.sr)}</Text>
                </View>
              </View>
              <Text style={[styles.compVal, { color: rc }]}>{riskLabel(patient.sr)}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>RPI Computation</Text>
          <View style={styles.formulaBox}>
            {domains && (
              <>
                <Text style={styles.formulaText}>
                  RPI = ({W.start}x{domains.start} + {W.rom}x{domains.rom}
                  {physioNotPerformed ? '' : ` + ${W.physio}x${domains.physio}`}
                  + {W.anthro}x{domains.anthro} + {W.comor}x{domains.comor} + {W.life}x{domains.life})
                  / {physioNotPerformed ? 100 : totalW}
                </Text>
                <Text style={[styles.formulaResult, { color: tc }]}>= {patient.rpi}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Clinical Inference</Text>
          <Text style={styles.inferenceText}>
            {patient.tier === 'Red' && `High-risk (RPI ${patient.rpi}/100). Immediate clinical review recommended.`}
            {patient.tier === 'Amber' && `Moderate-risk (RPI ${patient.rpi}/100). Structured physio + VR ROM exercises recommended. Reassess 4-6 weeks.`}
            {patient.tier === 'Green' && `Low-risk (RPI ${patient.rpi}/100). Routine monitoring. No significant domain flags.`}
          </Text>
          {issues.length > 0 && (
            <View style={styles.issuesList}>
              <Text style={styles.issuesTitle}>Key Drivers:</Text>
              {issues.map((issue, i) => (
                <Text key={i} style={styles.issueItem}>· {issue}</Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Anthropometric Detail</Text>
          <View style={styles.anthroRow}>
            <View style={styles.anthroItem}>
              <Text style={styles.anthroLabel}>Age Band</Text>
              <Text style={styles.anthroValue}>{ageBand}</Text>
              <Text style={styles.anthroPts}>{agePts}/5 pts</Text>
              <View style={styles.anthroBar}>
                <View style={[styles.anthroFill, { width: `${agePts / 5 * 100}%`, backgroundColor: Colors.blue }]} />
              </View>
            </View>
            <View style={styles.anthroItem}>
              <Text style={styles.anthroLabel}>Gender</Text>
              <Text style={styles.anthroValue}>{patient.g === 'F' ? 'Female' : 'Male'}</Text>
              <Text style={styles.anthroPts}>{patient.gr * 2}/2 pts</Text>
              <View style={styles.anthroBar}>
                <View style={[styles.anthroFill, { width: `${patient.gr * 100}%`, backgroundColor: '#ec4899' }]} />
              </View>
            </View>
          </View>
          <View style={styles.anthroNote}>
            <Text style={styles.anthroNoteText}>
              Sub-weights: Age {SW.anthro.age}% · Gender {SW.anthro.gen}%
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sub-Factor Breakdown</Text>
          <SubFactorRow domain="Anthropo" name={`Age (${ageBand})`} val={agePts} max={5} />
          <SubFactorRow domain="Anthropo" name={`Gender (${patient.g})`} val={patient.gr * 2} max={2} />
          <SubFactorRow domain="Comorbid" name="HTN" val={patient.htn} max={1} />
          <SubFactorRow domain="Comorbid" name="Diabetes" val={patient.dm} max={1} />
          <SubFactorRow domain="Comorbid" name="OA" val={patient.oa} max={1} />
          <SubFactorRow domain="Comorbid" name="Osteoporosis" val={patient.osteo} max={1} />
          <SubFactorRow domain="Comorbid" name="Injury" val={patient.injury} max={1} />
          <SubFactorRow domain="Comorbid" name="Surgery" val={patient.surgical} max={1} />
          <SubFactorRow domain="Comorbid" name="Thyroid" val={patient.thyroid} max={1} />
          <SubFactorRow domain="VR ROM" name="Flexion" val={patient.flex} max={10} />
          <SubFactorRow domain="VR ROM" name="Extension" val={patient.ext} max={10} />
          <SubFactorRow domain="VR ROM" name="Left Rot" val={patient.lrot} max={10} />
          <SubFactorRow domain="VR ROM" name="Right Rot" val={patient.rrot} max={10} />
          <SubFactorRow domain="STarT" name="Score" val={patient.start} max={9} />
          <SubFactorRow domain="Physio" name="FABER L" val={patient.fab_l} max={1} />
          <SubFactorRow domain="Physio" name="FAIR L" val={patient.fair_l} max={1} />
          <SubFactorRow domain="Physio" name="SLR L" val={patient.slr_l} max={1} />
          <SubFactorRow domain="Physio" name="FABER R" val={patient.fab_r} max={1} />
          <SubFactorRow domain="Physio" name="FAIR R" val={patient.fair_r} max={1} />
          <SubFactorRow domain="Physio" name="SLR R" val={patient.slr_r} max={1} />
          <SubFactorRow domain="Physio" name="Hyper-ext" val={patient.hyp} max={1} />
          <SubFactorRow domain="Physio" name="Tenderness" val={patient.tend} max={1} />
          <SubFactorRow domain="Physio" name="Tightness" val={patient.tight} max={1} />
          <SubFactorRow domain="Physio" name="Knots" val={patient.knots} max={1} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thresholds (Current)</Text>
          <View style={styles.threshRow}>
            <Text style={styles.threshLabel}>G→A Threshold:</Text>
            <Text style={[styles.threshValue, { color: Colors.greenDark }]}>{tga}</Text>
          </View>
          <View style={styles.threshRow}>
            <Text style={styles.threshLabel}>A→R Threshold:</Text>
            <Text style={[styles.threshValue, { color: Colors.amberDark }]}>{tar}</Text>
          </View>
          <Text style={styles.threshNote}>
            {patient.tier === 'Red' ? `RPI (${patient.rpi}) >= A→R (${tar}) → Red` :
              patient.tier === 'Amber' ? `RPI (${patient.rpi}) >= G→A (${tga}) but < A→R (${tar}) → Amber` :
                `RPI (${patient.rpi}) < G→A (${tga}) → Green`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    backgroundColor: '#0a1020',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
    alignItems: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: Colors.textWhite,
    marginRight: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  backBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  backBtnText: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
    alignItems: 'center',
  },
  rpiCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0f172a',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpiValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  rpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  heroInfo: {
    flex: 1,
  },
  heroMeta: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
  },
  heroTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  tierTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  tierTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  manualText: {
    fontSize: 12,
    fontWeight: '700',
  },
  matchBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  matchBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 10,
    padding: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  toggleSwitch: {
    transform: [{ scaleX: 0.95 }, { scaleY: 0.95 }],
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    marginRight: 8,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  compLabel: {
    width: 50,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  compBarWrap: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  compBar: {
    height: 22,
    borderRadius: 5,
    justifyContent: 'center',
    paddingLeft: 8,
    minWidth: 6,
  },
  compBarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  compVal: {
    width: 60,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  formulaBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  formulaText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  formulaResult: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  inferenceText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 8,
  },
  issuesList: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  issuesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991b1b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  issueItem: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 20,
  },
  anthroRow: {
    flexDirection: 'row',
    gap: 14,
  },
  anthroItem: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
  },
  anthroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  anthroValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  anthroPts: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
  },
  anthroBar: {
    height: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    overflow: 'hidden',
  },
  anthroFill: {
    height: 8,
    borderRadius: 4,
  },
  anthroNote: {
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
  },
  anthroNoteText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '700',
  },
  threshRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  threshLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  threshValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  threshNote: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  manualHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
    lineHeight: 16,
  },
  riskButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  riskBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  overrideNote: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    padding: 8,
  },
  overrideNoteText: {
    fontSize: 11,
    color: '#1e40af',
    fontWeight: '600',
    textAlign: 'center',
  },
});
