import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, ChevronDown, ArrowRight, LogOut, EyeOff, Database } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRPI } from '@/contexts/RPIContext';
import { useAuth } from '@/contexts/AuthContext';
import { WeightControls } from '@/components/WeightControls';
import Colors from '@/constants/colors';
import { tierColor, riskColor, riskLabel, getMatchType } from '@/data/scoring';
import { PatientResult, SortColumn } from '@/data/types';

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

const PatientRow = React.memo(function PatientRow({ p, onPress, displayName }: { p: PatientResult; onPress: () => void; displayName: string }) {
  const tc = tierColor(p.tier);
  const rc = riskColor(p.sr);
  const match = getMatchType(p.sr, p.tier);
  const matchColor = match === 'Concordant' ? Colors.greenDark : match === 'Partial' ? Colors.amberDark : match === 'Discordant' ? Colors.redDark : Colors.textMuted;

  return (
    <TouchableOpacity style={styles.patientRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName} numberOfLines={1}>{displayName}</Text>
        <View style={styles.patientMeta}>
          <Text style={styles.patientAge}>{p.age}{p.g === 'F' ? 'F' : 'M'}</Text>
          <View style={styles.siteBadge}>
            <Text style={styles.siteBadgeText}>{p.site}</Text>
          </View>
          <Text style={[styles.riskText, { color: rc }]}>{riskLabel(p.sr)}</Text>
        </View>
      </View>
      <View style={styles.patientScores}>
        <View style={styles.rpiBlock}>
          <View style={[styles.rpiBar, { width: Math.max(4, p.rpi * 0.6), backgroundColor: tc }]} />
          <Text style={[styles.rpiScore, { color: tc }]}>{p.rpi}</Text>
        </View>
        <View style={[styles.tierPill, { backgroundColor: p.tier === 'Red' ? '#450a0a' : p.tier === 'Amber' ? '#451a03' : '#14532d', borderColor: tc }]}>
          <Text style={[styles.tierPillText, { color: tc }]}>{p.tier}</Text>
        </View>
        {match && (
          <Text style={[styles.matchText, { color: matchColor }]}>
            {match === 'Concordant' ? '✓' : match === 'Partial' ? '~' : '✗'}
          </Text>
        )}
        <ArrowRight size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
});

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    stats, filteredResults, results,
    searchQuery, setSearchQuery,
    filterRisk, setFilterRisk,
    filterTier, setFilterTier,
    filterSite, setFilterSite,
    toggleSort, sortCol, sortDir,
    getDisplayName,
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
              <View style={[styles.dbBadge, { backgroundColor: isDbConnected ? '#052e16' : '#450a0a', borderColor: isDbConnected ? '#166534' : '#991b1b' }]}>
                <Database size={9} color={isDbConnected ? '#4ade80' : '#f87171'} />
                <Text style={[styles.dbBadgeText, { color: isDbConnected ? '#4ade80' : '#f87171' }]}>
                  {isDataLoading ? 'Syncing' : isDbConnected ? 'DB' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.topBarRight}>
            <View style={styles.anonToggle}>
              <EyeOff size={13} color={anonymize ? '#60a5fa' : '#475569'} />
              <Text style={[styles.anonLabel, anonymize && styles.anonLabelActive]}>Anon</Text>
              <Switch
                value={anonymize}
                onValueChange={toggleAnonymize}
                trackColor={{ false: '#1e293b', true: '#1e3a5f' }}
                thumbColor={anonymize ? '#60a5fa' : '#475569'}
                style={styles.anonSwitch}
              />
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
              <LogOut size={14} color="#f87171" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <WeightControls />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={styles.statsRowContent}>
          <StatCard label="Total" value={stats.total} sub="4 sites" />
          <StatCard label="Green" value={stats.green} sub="Low risk" color={Colors.greenDark} />
          <StatCard label="Amber" value={stats.amber} sub="Moderate" color={Colors.amberDark} />
          <StatCard label="Red" value={stats.red} sub="High risk" color={Colors.redDark} />
          <StatCard label="Sensitivity" value={`${stats.sens}%`} sub="High→Red" color={stats.sens >= 70 ? Colors.greenDark : Colors.redDark} />
          <StatCard label="Precision" value={`${stats.prec}%`} sub="Red→High" color={stats.prec >= 70 ? Colors.greenDark : Colors.amberDark} />
          <StatCard label="Accuracy" value={`${stats.acc}%`} sub="Classified" color={stats.acc >= 75 ? Colors.greenDark : Colors.amberDark} />
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

          {filteredResults.map((p) => (
            <PatientRow key={p.name} p={p} displayName={getDisplayName(p.name)} onPress={() => handlePatientPress(p.name)} />
          ))}
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
  topBar: {
    backgroundColor: '#0a1020',
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
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
    backgroundColor: '#0d1835',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  anonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  anonLabelActive: {
    color: '#60a5fa',
  },
  anonSwitch: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1a0a0a',
    borderWidth: 1,
    borderColor: '#991b1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '900' as const,
    color: Colors.textWhite,
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
    color: '#0f172a',
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
    color: '#0f172a',
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
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  patientInfo: {
    flex: 1,
    marginRight: 10,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 3,
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientAge: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  siteBadge: {
    backgroundColor: Colors.surfaceMid,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
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
  },
  rpiBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
});
