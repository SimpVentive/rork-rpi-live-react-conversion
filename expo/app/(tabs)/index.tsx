import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Image, useWindowDimensions, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, ChevronDown, ArrowRight, LogOut, EyeOff, Database, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRPI } from '@/contexts/RPIContext';
import { useAuth } from '@/contexts/AuthContext';
import { WeightControls } from '@/components/WeightControls';
import Colors from '@/constants/colors';
import { colors, fonts } from '@/constants/theme';
import { tierColor, riskColor, riskLabel, getMatchType } from '@/data/scoring';
import { PatientResult, SortColumn, GroupWeights } from '@/data/types';

type OptimizationResult = {
  weights: GroupWeights;
  tga: number;
  tar: number;
  stats: { acc: number; sens: number; prec: number };
  combinations: number;
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
      <ChevronDown size={12} color={active ? Colors.blue : Colors.textMuted} />
    </TouchableOpacity>
  );
}

const PatientRow = React.memo(function PatientRow({ p, onPress, displayName, wide }: { p: PatientResult; onPress: () => void; displayName: string; wide: boolean }) {
  const tc = tierColor(p.tier);
  const rc = riskColor(p.sr);
  const match = getMatchType(p.sr, p.tier);
  const matchColor = match === 'Concordant' ? Colors.greenDark : match === 'Partial' ? Colors.amberDark : match === 'Discordant' ? Colors.redDark : Colors.textMuted;
  const noPhysio = !!p.physioNotPerformed;

  if (wide) {
    return (
      <TouchableOpacity style={styles.tableRow} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.patientInfo, styles.nameCell]}>
          <Text style={styles.patientName} numberOfLines={1}>{displayName}</Text>
          <View style={styles.patientMetaRow}>
            <Text style={styles.patientMetaText}>{p.age}{p.g} · {p.site}</Text>
            {noPhysio && (
              <View style={styles.noPhysioBadge}>
                <Text style={styles.noPhysioBadgeText}>No Physio</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.riskText, { color: rc }]}>{riskLabel(p.sr)}</Text>
        <View style={[styles.tierPill, { backgroundColor: p.tier === 'Red' ? Colors.redBg : p.tier === 'Amber' ? Colors.amberBg : Colors.greenBg, borderColor: tc }]}>
          <Text style={[styles.tierPillText, { color: tc }]}>{p.tier}</Text>
        </View>
        <View style={styles.rpiBlock}>
          <View style={[styles.rpiBar, { width: Math.max(4, p.rpi * 0.6), backgroundColor: tc }]} />
          <Text style={[styles.rpiScore, { color: tc }]}>{p.rpi}</Text>
        </View>
        <Text style={[styles.matchText, { color: matchColor }]}>{match === 'Concordant' ? '✓' : match === 'Partial' ? '~' : '✗'}</Text>
        <ArrowRight size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.patientCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName} numberOfLines={1}>{displayName}</Text>
        <View style={styles.patientMeta}>
          <Text style={styles.patientAge}>{p.age}{p.g}</Text>
          <View style={styles.siteBadge}>
            <Text style={styles.siteBadgeText}>{p.site}</Text>
          </View>
          {noPhysio && (
            <View style={styles.noPhysioBadgeCompact}>
              <Text style={styles.noPhysioBadgeText}>No Physio</Text>
            </View>
          )}
          <Text style={[styles.riskText, { color: rc }]}>{riskLabel(p.sr)}</Text>
        </View>
      </View>
      <View style={styles.patientScores}>
        <View style={styles.rpiBlock}>
          <View style={[styles.rpiBar, { width: Math.max(4, p.rpi * 0.6), backgroundColor: tc }]} />
          <Text style={[styles.rpiScore, { color: tc }]}>{p.rpi}</Text>
        </View>
        <View style={[styles.tierPill, { backgroundColor: p.tier === 'Red' ? Colors.redBg : p.tier === 'Amber' ? Colors.amberBg : Colors.greenBg, borderColor: tc }]}>
          <Text style={[styles.tierPillText, { color: tc }]}>{p.tier}</Text>
        </View>
        <Text style={[styles.matchText, { color: matchColor }]}>{match === 'Concordant' ? '✓' : match === 'Partial' ? '~' : '✗'}</Text>
        <ArrowRight size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
});

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 940;

  const {
    stats, filteredResults, results,
    searchQuery, setSearchQuery,
    filterRisk, setFilterRisk,
    filterTier, setFilterTier,
    filterSite, setFilterSite,
    filterGender, setFilterGender,
    toggleSort, sortCol, sortDir,
    getDisplayName,
    runOptimization, optimizing, optProgress, optResults, showOptModal, setShowOptModal, applyOptimalWeights,
    minDomainWeight, setMinDomainWeight,
    W, tga, tar,
    isDataLoading, isDbConnected,
  } = useRPI();
  const { siteLabel, anonymize, toggleAnonymize, logout } = useAuth();

  const handlePatientPress = useCallback((name: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/patient/${encodeURIComponent(name)}`);
  }, [router]);

  const cycleRisk = useCallback(() => {
    const vals = ['', 'H', 'M', 'L', 'U'];
    const idx = vals.indexOf(filterRisk);
    setFilterRisk(vals[(idx + 1) % vals.length]);
  }, [filterRisk, setFilterRisk]);

  const cycleTier = useCallback(() => {
    const vals = ['', 'Red', 'Amber', 'Green'];
    const idx = vals.indexOf(filterTier);
    setFilterTier(vals[(idx + 1) % vals.length]);
  }, [filterTier, setFilterTier]);

  const cycleSite = useCallback(() => {
    const vals = ['', 'KIMS', 'Kues', 'Abhis', 'SDD'];
    const idx = vals.indexOf(filterSite);
    setFilterSite(vals[(idx + 1) % vals.length]);
  }, [filterSite, setFilterSite]);

  const cycleGender = useCallback(() => {
    const vals = ['', 'M', 'F'];
    const idx = vals.indexOf(filterGender);
    setFilterGender(vals[(idx + 1) % vals.length]);
  }, [filterGender, setFilterGender]);

  const handleSortName = useCallback(() => toggleSort('name' as SortColumn), [toggleSort]);
  const handleSortAge = useCallback(() => toggleSort('age' as SortColumn), [toggleSort]);
  const handleSortRpi = useCallback(() => toggleSort('rpi' as SortColumn), [toggleSort]);

  const sortIcon = useCallback((col: SortColumn) => {
    if (sortCol === col) {
      return sortDir === -1 ? ' ↓' : ' ↑';
    }
    return '';
  }, [sortCol, sortDir]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}> 
      <View style={styles.topBar}>
        <View style={styles.topBarLogoRow}>
          <Image source={require('@/assets/images/metaloga-logo.png')} style={styles.logoLeft} resizeMode="contain" />
          <View style={styles.brandCenter}>
            <Text style={styles.brandTitle}>Prognosis AI Engine</Text>
            <Text style={styles.brandVersion}>(V1)</Text>
          </View>
          <Image source={require('@/assets/images/relversiv-logo.png')} style={styles.logoRight} resizeMode="contain" />
        </View>
        <View style={styles.topBarSecondRow}>
          <View style={styles.topBarLeft}>
            <View style={styles.brandSubRow}>
              <Text style={styles.brandSub}>{siteLabel} · {results.length} patients</Text>
              <View style={[styles.dbBadge, { backgroundColor: isDbConnected ? Colors.greenBg : Colors.redBg, borderColor: isDbConnected ? Colors.green : Colors.red }]}> 
                <Database size={9} color={isDbConnected ? Colors.green : Colors.red} />
                <Text style={[styles.dbBadgeText, { color: isDbConnected ? Colors.green : Colors.red }]}> 
                  {isDataLoading ? 'Syncing' : isDbConnected ? 'DB' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.topBarRight}>
            <View style={styles.anonToggle}>
              <EyeOff size={13} color={anonymize ? Colors.blue : Colors.textMuted} />
              <Text style={[styles.anonLabel, anonymize && styles.anonLabelActive]}>Anon</Text>
              <Switch
                value={anonymize}
                onValueChange={toggleAnonymize}
                trackColor={{ false: Colors.border, true: Colors.bluePale }}
                thumbColor={anonymize ? Colors.blue : Colors.textMuted}
                style={styles.anonSwitch}
              />
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
              <LogOut size={14} color={Colors.red} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <WeightControls />

      <View style={styles.optimaToolbar}>
        <View style={styles.optimaToolbarLeft}>
          <Text style={styles.optimaToolbarLabel}>Minimum % per domain</Text>
          <TextInput
            style={styles.optimaToolbarInput}
            keyboardType="numeric"
            value={String(minDomainWeight)}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (text.trim() === '') {
                setMinDomainWeight(1);
              } else if (!Number.isNaN(num)) {
                setMinDomainWeight(Math.max(1, Math.min(20, num)));
              }
            }}
            maxLength={2}
          />
        </View>
        <TouchableOpacity
          style={[styles.optimaButton, optimizing && styles.optimaButtonDisabled]}
          onPress={() => runOptimization()}
          disabled={optimizing}
          activeOpacity={0.8}
        >
          {optimizing && <ActivityIndicator size="small" color={Colors.white} style={styles.optimaSpinner} />}
          <Text style={styles.optimaButtonText}>{optimizing ? 'Running...' : 'Find Optima'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={styles.statsRowContent}>
          <StatCard label="Patients" value={results.length} sub="Full cohort" />
          <StatCard label="Green" value={stats.green} sub="Low risk" color={Colors.greenDark} />
          <StatCard label="Amber" value={stats.amber} sub="Moderate" color={Colors.amberDark} />
          <StatCard label="Red" value={stats.red} sub="High risk" color={Colors.redDark} />
          <StatCard label="Accuracy" value={`${stats.acc}%`} sub="Classified" color={stats.acc >= 75 ? Colors.greenDark : Colors.amberDark} />
          <StatCard label="Precision" value={`${stats.prec}%`} sub="Red→High" color={stats.prec >= 70 ? Colors.greenDark : Colors.amberDark} />
        </ScrollView>

        <View style={styles.registryCard}>
          <View style={styles.registryHeader}>
            <Text style={styles.registryTitle}>Patient Registry</Text>
            <Text style={styles.registryCount}>{filteredResults.length} of {results.length}</Text>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            <FilterChip label={filterRisk ? riskLabel(filterRisk) : 'Risk'} active={!!filterRisk} onPress={cycleRisk} />
            <FilterChip label={filterTier || 'Tier'} active={!!filterTier} onPress={cycleTier} />
            <FilterChip label={filterSite || 'Site'} active={!!filterSite} onPress={cycleSite} />
            <FilterChip label={filterGender || 'Gender'} active={!!filterGender} onPress={cycleGender} />
          </View>

          <View style={styles.sortRow}>
            <TouchableOpacity onPress={handleSortName} style={styles.sortBtn}>
              <Text style={styles.sortBtnText}>Name{sortIcon('name')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSortAge} style={styles.sortBtn}>
              <Text style={styles.sortBtnText}>Age{sortIcon('age')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSortRpi} style={styles.sortBtn}>
              <Text style={styles.sortBtnText}>RPI{sortIcon('rpi')}</Text>
            </TouchableOpacity>
          </View>

          {isWide && (
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.nameCell]}>Patient</Text>
              <Text style={styles.tableHeaderText}>Risk</Text>
              <Text style={styles.tableHeaderText}>Tier</Text>
              <Text style={styles.tableHeaderText}>RPI</Text>
              <Text style={styles.tableHeaderText}>Match</Text>
              <Text style={[styles.tableHeaderText, { width: 24 }]} />
            </View>
          )}

          {filteredResults.map((p) => (
            <PatientRow key={p.name} p={p} displayName={getDisplayName(p.name)} onPress={() => handlePatientPress(p.name)} wide={isWide} />
          ))}
        </View>
      </ScrollView>

      <OptimizationModal
        visible={showOptModal}
        onClose={() => setShowOptModal(false)}
        results={optResults}
        currentWeights={W}
        currentTga={tga}
        currentTar={tar}
        currentStats={stats}
        onApply={applyOptimalWeights}
      />
    </View>
  );
}

function OptimizationModal({ visible, onClose, results, currentWeights, currentTga, currentTar, currentStats, onApply }: {
  visible: boolean;
  onClose: () => void;
  results: OptimizationResult | null;
  currentWeights: GroupWeights;
  currentTga: number;
  currentTar: number;
  currentStats: { acc: number; sens: number; prec: number };
  onApply: () => void;
}) {
  if (!results) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Optimization Results</Text>
          <Text style={styles.modalSubtitle}>
            Tested {results.combinations.toLocaleString()} combinations
          </Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
              <View style={styles.statsComparison}>
                <View style={styles.statsColumn}>
                  <Text style={styles.columnTitle}>Before</Text>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{currentStats.acc}%</Text>
                    <Text style={styles.statLabel}>Accuracy</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{currentStats.prec}%</Text>
                    <Text style={styles.statLabel}>Precision</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{currentStats.sens}%</Text>
                    <Text style={styles.statLabel}>Sensitivity</Text>
                  </View>
                </View>
                <View style={styles.statsColumn}>
                  <Text style={styles.columnTitle}>After</Text>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, results.stats.acc !== currentStats.acc && styles.statValueChanged]}>
                      {results.stats.acc}%
                    </Text>
                    <Text style={styles.statLabel}>Accuracy</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, results.stats.prec !== currentStats.prec && styles.statValueChanged]}>
                      {results.stats.prec}%
                    </Text>
                    <Text style={styles.statLabel}>Precision</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, results.stats.sens !== currentStats.sens && styles.statValueChanged]}>
                      {results.stats.sens}%
                    </Text>
                    <Text style={styles.statLabel}>Sensitivity</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.weightsSection}>
              <Text style={styles.sectionTitle}>Weights & Thresholds</Text>
              <View style={styles.weightsComparison}>
                <View style={styles.weightsColumn}>
                  <Text style={styles.columnTitle}>Before</Text>
                  {Object.entries(currentWeights).map(([key, value]) => (
                    <View key={key} style={styles.weightRow}>
                      <Text style={styles.weightLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                      <Text style={styles.weightValue}>{value}%</Text>
                    </View>
                  ))}
                  <View style={styles.thresholdRowModal}>
                    <Text style={styles.weightLabel}>TGA</Text>
                    <Text style={styles.weightValue}>{currentTga}</Text>
                  </View>
                  <View style={styles.thresholdRowModal}>
                    <Text style={styles.weightLabel}>TAR</Text>
                    <Text style={styles.weightValue}>{currentTar}</Text>
                  </View>
                </View>
                <View style={styles.weightsColumn}>
                  <Text style={styles.columnTitle}>After</Text>
                  {Object.entries(results.weights).map(([key, value]) => (
                    <View key={key} style={styles.weightRow}>
                      <Text style={styles.weightLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                      <Text style={[styles.weightValue, value !== currentWeights[key as keyof GroupWeights] && styles.weightValueChanged]}>
                        {value}%
                      </Text>
                    </View>
                  ))}
                  <View style={styles.thresholdRowModal}>
                    <Text style={styles.weightLabel}>TGA</Text>
                    <Text style={[styles.weightValue, results.tga !== currentTga && styles.weightValueChanged]}>
                      {results.tga}
                    </Text>
                  </View>
                  <View style={styles.thresholdRowModal}>
                    <Text style={styles.weightLabel}>TAR</Text>
                    <Text style={[styles.weightValue, results.tar !== currentTar && styles.weightValueChanged]}>
                      {results.tar}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={onApply} activeOpacity={0.7}>
              <Text style={styles.applyBtnText}>Apply Optimal Weights</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topBarLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  logoLeft: {
    width: 80,
    height: 28,
  },
  logoRight: {
    width: 120,
    height: 42,
  },
  brandCenter: {
    flex: 1,
    alignItems: 'center',
  },
  brandVersion: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  topBarSecondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarLeft: {
    flex: 1,
    marginRight: 8,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  anonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  anonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  anonLabelActive: {
    color: Colors.blue,
  },
  anonSwitch: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '900' as const,
    color: Colors.text,
    letterSpacing: 0.5,
    textAlign: 'center' as const,
  },
  brandSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  brandSubRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 1,
  },
  dbBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  dbBadgeText: {
    fontSize: 8,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },

  scrollContent: {
    flex: 1,
  },
  statsRow: {
    marginTop: 12,
    marginBottom: 12,
  },
  statsRowContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 110,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
  },
  statSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  registryCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  registryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceMid,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  registryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  registryCount: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  searchRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textDark,
    paddingVertical: 8,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.blue,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surfaceMid,
  },
  sortBtn: {
    paddingVertical: 2,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  optimaToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
  },
  optimaToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  optimaToolbarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  optimaToolbarInput: {
    width: 54,
    height: 34,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    color: Colors.textDark,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  optimaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 118,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#92400e',
    borderRadius: 10,
  },
  optimaButtonDisabled: {
    backgroundColor: '#64748b',
  },
  optimaButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  optimaSpinner: {
    marginRight: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surfaceMid,
  },
  tableHeaderText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  nameCell: {
    flex: 2.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  patientCard: {
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: 14,
    marginVertical: 6,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  patientInfo: {
    flex: 1,
    marginRight: 10,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  patientMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noPhysioBadge: {
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  noPhysioBadgeCompact: {
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  noPhysioBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  patientMetaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  patientAge: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  siteBadge: {
    backgroundColor: Colors.surfaceMid,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  siteBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '700',
  },
  patientScores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rpiBar: {
    height: 6,
    borderRadius: 3,
  },
  rpiScore: {
    fontSize: 14,
    fontWeight: '800',
  },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  matchText: {
    fontSize: 14,
    fontWeight: '800',
    width: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '90%',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  modalScroll: {
    marginBottom: 18,
  },
  statsSection: {
    marginBottom: 18,
  },
  weightsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  statsComparison: {
    flexDirection: 'row',
    gap: 14,
  },
  weightsComparison: {
    flexDirection: 'row',
    gap: 14,
  },
  statsColumn: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
  },
  weightsColumn: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 10,
  },
  statItem: {
    marginBottom: 10,
  },
  statValueChanged: {
    color: Colors.blue,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weightLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  weightValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '700',
  },
  weightValueChanged: {
    color: Colors.blue,
  },
  thresholdRowModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceMid,
    borderRadius: 12,
  },
  cancelBtnText: {
    color: Colors.textMuted,
    fontWeight: '700',
  },
  applyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.blue,
    borderRadius: 12,
  },
  applyBtnText: {
    color: Colors.white,
    fontWeight: '800',
  },
});
