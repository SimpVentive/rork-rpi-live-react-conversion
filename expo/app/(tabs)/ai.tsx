import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrainCircuit, Trophy, ChevronDown } from 'lucide-react-native';
import { useRPI } from '@/contexts/RPIContext';
import {
  sSTarT, sROM, sPhysio, sAnthropo, sComor, sLife, riskLabel,
} from '@/data/scoring';
import { PatientResult } from '@/data/types';

interface AIPatientRow {
  name: string;
  displayName: string;
  start: number;
  rom: number;
  physio: number;
  anthro: number;
  comor: number;
  life: number;
  rpiScore: number;
  rpiTier: 'Red' | 'Amber' | 'Green';
  manualRisk: string;
  rpiNumeric: number;
  manualNumeric: number;
  ratio: number;
  ratioDistance: number;
  site: string;
}

function mapRiskToNumeric(sr: string): number {
  if (sr === 'H') return 3;
  if (sr === 'M') return 2;
  if (sr === 'L') return 1;
  return 0;
}

function mapTierToNumeric(tier: 'Red' | 'Amber' | 'Green'): number {
  if (tier === 'Red') return 3;
  if (tier === 'Amber') return 2;
  return 1;
}

type SortKey = 'name' | 'rpi' | 'ratio' | 'start' | 'rom' | 'physio' | 'anthro' | 'comor' | 'life';

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const { results, SW, getLifeOverride, getDisplayName, W } = useRPI();
  const [sortKey, setSortKey] = useState<SortKey>('ratio');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [filterSite, setFilterSite] = useState<string>('');

  const aiData = useMemo(() => {
    const classifiedResults = results.filter((r: PatientResult) => r.sr !== 'U');

    const rows: AIPatientRow[] = classifiedResults.map((p: PatientResult) => {
      const startScore = sSTarT(p);
      const romScore = sROM(p, SW);
      const physioScore = sPhysio(p, SW);
      const anthroScore = sAnthropo(p, SW);
      const comorScore = sComor(p, SW);
      const lifeScore = sLife(p, SW, getLifeOverride(p.name));
      const rpiN = mapTierToNumeric(p.tier);
      const manualN = mapRiskToNumeric(p.sr);
      const ratio = manualN > 0 ? parseFloat((rpiN / manualN).toFixed(2)) : 0;
      const distance = Math.abs(ratio - 1.0);

      return {
        name: p.name,
        displayName: getDisplayName(p.name),
        start: startScore,
        rom: romScore,
        physio: physioScore,
        anthro: anthroScore,
        comor: comorScore,
        life: lifeScore,
        rpiScore: p.rpi,
        rpiTier: p.tier,
        manualRisk: p.sr,
        rpiNumeric: rpiN,
        manualNumeric: manualN,
        ratio,
        ratioDistance: distance,
        site: p.site,
      };
    });

    return rows;
  }, [results, SW, getLifeOverride, getDisplayName]);

  const sortedData = useMemo(() => {
    let filtered = filterSite ? aiData.filter((r) => r.site === filterSite) : aiData;

    const sorted = [...filtered].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      if (sortKey === 'name') {
        aVal = a.displayName.toLowerCase();
        bVal = b.displayName.toLowerCase();
        return sortAsc
          ? (aVal < bVal ? -1 : aVal > bVal ? 1 : 0)
          : (aVal > bVal ? -1 : aVal < bVal ? 1 : 0);
      }
      if (sortKey === 'ratio') {
        aVal = a.ratioDistance;
        bVal = b.ratioDistance;
      } else {
        aVal = a[sortKey as keyof AIPatientRow] as number;
        bVal = b[sortKey as keyof AIPatientRow] as number;
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [aiData, sortKey, sortAsc, filterSite]);

  const top3Indices = useMemo(() => {
    const byDistance = [...sortedData].sort((a, b) => a.ratioDistance - b.ratioDistance);
    const top3Names = new Set(byDistance.slice(0, 3).map((r) => r.name));
    return top3Names;
  }, [sortedData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === 'ratio' ? true : false);
    }
  };

  const cycleSite = () => {
    const vals = ['', 'KIMS', 'Kues', 'Abhis', 'SDD'];
    const idx = vals.indexOf(filterSite);
    setFilterSite(vals[(idx + 1) % vals.length]);
  };

  const totalClassified = aiData.length;
  const perfectMatch = aiData.filter((r) => r.ratio === 1.0).length;
  const avgRatio = totalClassified > 0
    ? (aiData.reduce((s, r) => s + r.ratio, 0) / totalClassified).toFixed(2)
    : '0';

  const getRankBadge = (name: string): number | null => {
    const byDistance = [...aiData].sort((a, b) => a.ratioDistance - b.ratioDistance);
    const idx = byDistance.findIndex((r) => r.name === name);
    if (idx >= 0 && idx < 3) return idx + 1;
    return null;
  };

  const getRatioColor = (ratio: number, isTop3: boolean): string => {
    if (isTop3) return '#0d9488';
    if (ratio === 1.0) return '#15803d';
    if (ratio >= 0.8 && ratio <= 1.2) return '#b45309';
    return '#dc2626';
  };

  const getTierColor = (tier: 'Red' | 'Amber' | 'Green'): string => {
    if (tier === 'Red') return '#dc2626';
    if (tier === 'Amber') return '#b45309';
    return '#15803d';
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topBarRow}>
          <BrainCircuit size={20} color="#06b6d4" />
          <View style={styles.topBarText}>
            <Text style={styles.topTitle}>AI Analysis</Text>
            <Text style={styles.topSub}>RPI vs Manual Classification · {totalClassified} classified</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardAccent]}>
            <Text style={styles.summaryValue}>{perfectMatch}</Text>
            <Text style={styles.summaryLabel}>Perfect Match</Text>
            <Text style={styles.summaryNote}>Ratio = 1.0</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{avgRatio}</Text>
            <Text style={styles.summaryLabel}>Avg Ratio</Text>
            <Text style={styles.summaryNote}>RPI / Manual</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalClassified}</Text>
            <Text style={styles.summaryLabel}>Classified</Text>
            <Text style={styles.summaryNote}>Excl. U</Text>
          </View>
        </View>

        <View style={styles.filterBar}>
          <TouchableOpacity style={[styles.filterChip, filterSite ? styles.filterChipActive : undefined]} onPress={cycleSite}>
            <Text style={[styles.filterChipText, filterSite ? styles.filterChipTextActive : undefined]}>
              {filterSite || 'All Sites'}
            </Text>
            <ChevronDown size={12} color={filterSite ? '#0d9488' : '#64748b'} />
          </TouchableOpacity>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#0d9488' }]} />
            <Text style={styles.legendText}>Top 3 closest to 1.0</Text>
          </View>
        </View>

        <View style={styles.tableCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View style={styles.tableHeader}>
                <TouchableOpacity style={[styles.thCell, styles.thName]} onPress={() => handleSort('name')}>
                  <Text style={styles.thText}>Patient{sortKey === 'name' ? (sortAsc ? ' ↑' : ' ↓') : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.thCell} onPress={() => handleSort('start')}>
                  <Text style={styles.thText}>STarT{sortKey === 'start' ? (sortAsc ? ' ↑' : ' ↓') : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.thCell} onPress={() => handleSort('rom')}>
                  <Text style={styles.thText}>ROM{sortKey === 'rom' ? (sortAsc ? ' ↑' : ' ↓') : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.thCell} onPress={() => handleSort('physio')}>
                  <Text style={styles.thText}>Physio{sortKey === 'physio' ? (sortAsc ? ' ↑' : ' ↓') : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.thCell} onPress={() => handleSort('anthro')}>
                  <Text style={styles.thText}>Anthro{sortKey === 'anthro' ? (sortAsc ? ' ↑' : ' ↓') : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.thCell} onPress={() => handleSort('comor')}>
                  <Text style={styles.thText}>Comor{sortKey === 'comor' ? (sortAsc ? ' ↑' : ' ↓') : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.thCell} onPress={() => handleSort('life')}>
                  <Text style={styles.thText}>Life{sortKey === 'life' ? (sortAsc ? ' ↑' : ' ↓') : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.thCell} onPress={() => handleSort('rpi')}>
                  <Text style={styles.thText}>RPI{sortKey === 'rpi' ? (sortAsc ? ' ↑' : ' ↓') : ''}</Text>
                </TouchableOpacity>
                <View style={styles.thCell}>
                  <Text style={styles.thText}>Manual</Text>
                </View>
                <TouchableOpacity style={[styles.thCell, styles.thRatio]} onPress={() => handleSort('ratio')}>
                  <Text style={[styles.thText, styles.thTextRatio]}>
                    RPI/Man{sortKey === 'ratio' ? (sortAsc ? ' ↑' : ' ↓') : ''}
                  </Text>
                </TouchableOpacity>
              </View>

              {sortedData.map((row, idx) => {
                const isTop3 = top3Indices.has(row.name);
                const rank = getRankBadge(row.name);
                const ratioColor = getRatioColor(row.ratio, isTop3);

                return (
                  <View
                    key={row.name}
                    style={[
                      styles.tableRow,
                      idx % 2 === 0 ? styles.tableRowEven : undefined,
                      isTop3 ? styles.tableRowHighlight : undefined,
                    ]}
                  >
                    <View style={[styles.tdCell, styles.tdName]}>
                      {rank && (
                        <View style={styles.rankBadge}>
                          <Trophy size={9} color="#fff" />
                          <Text style={styles.rankText}>{rank}</Text>
                        </View>
                      )}
                      <View>
                        <Text style={[styles.tdText, styles.tdNameText]} numberOfLines={1}>{row.displayName}</Text>
                        <Text style={styles.tdSite}>{row.site}</Text>
                      </View>
                    </View>
                    <View style={styles.tdCell}>
                      <Text style={styles.tdText}>{row.start}</Text>
                    </View>
                    <View style={styles.tdCell}>
                      <Text style={styles.tdText}>{row.rom}</Text>
                    </View>
                    <View style={styles.tdCell}>
                      <Text style={styles.tdText}>{row.physio}</Text>
                    </View>
                    <View style={styles.tdCell}>
                      <Text style={styles.tdText}>{row.anthro}</Text>
                    </View>
                    <View style={styles.tdCell}>
                      <Text style={styles.tdText}>{row.comor}</Text>
                    </View>
                    <View style={styles.tdCell}>
                      <Text style={styles.tdText}>{row.life}</Text>
                    </View>
                    <View style={styles.tdCell}>
                      <View style={[styles.rpiPill, { backgroundColor: getTierColor(row.rpiTier) + '18' }]}>
                        <Text style={[styles.tdTextBold, { color: getTierColor(row.rpiTier) }]}>{row.rpiScore}</Text>
                      </View>
                    </View>
                    <View style={styles.tdCell}>
                      <Text style={styles.tdText}>{riskLabel(row.manualRisk)}</Text>
                    </View>
                    <View style={[styles.tdCell, styles.tdRatio]}>
                      <View style={[styles.ratioPill, { backgroundColor: ratioColor + '18', borderColor: ratioColor + '40' }]}>
                        <Text style={[styles.ratioText, { color: ratioColor }]}>
                          {row.ratio.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How RPI/Manual Ratio Works</Text>
          <View style={styles.infoRow}>
            <View style={[styles.infoDot, { backgroundColor: '#0d9488' }]} />
            <Text style={styles.infoText}><Text style={styles.infoBold}>= 1.00</Text> — Perfect concordance (RPI tier matches manual risk)</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoDot, { backgroundColor: '#b45309' }]} />
            <Text style={styles.infoText}><Text style={styles.infoBold}>0.80–1.20</Text> — Near match, minor deviation</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoDot, { backgroundColor: '#dc2626' }]} />
            <Text style={styles.infoText}><Text style={styles.infoBold}>{'<'}0.80 or {'>'}1.20</Text> — Significant discordance</Text>
          </View>
          <Text style={styles.infoFooter}>
            Mapping: High/Red=3, Moderate/Amber=2, Low/Green=1. Ratio = RPI tier value / Manual risk value.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Current Weights</Text>
          <Text style={styles.infoFooter}>
            STarT {W.start}% · ROM {W.rom}% · Physio {W.physio}% · Anthro {W.anthro}% · Comorbid {W.comor}% · Life {W.life}%
          </Text>
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
    borderBottomColor: '#0e7490',
  },
  topBarRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  topBarText: {
    flex: 1,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: '#ecfeff',
  },
  topSub: {
    fontSize: 12,
    color: '#67e8f9',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
  },
  summaryCardAccent: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: '#0f172a',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  summaryNote: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  filterBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#0d9488',
  },
  legendRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600' as const,
  },
  tableCard: {
    marginHorizontal: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row' as const,
    backgroundColor: '#0f172a',
  },
  thCell: {
    width: 60,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  thName: {
    width: 120,
    alignItems: 'flex-start' as const,
    paddingLeft: 10,
  },
  thRatio: {
    width: 72,
    backgroundColor: '#164e63',
  },
  thText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  thTextRatio: {
    color: '#67e8f9',
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  tableRowHighlight: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 3,
    borderLeftColor: '#0d9488',
  },
  tdCell: {
    width: 60,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  tdName: {
    width: 120,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingLeft: 8,
  },
  tdText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#334155',
  },
  tdTextBold: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  tdNameText: {
    fontWeight: '600' as const,
    color: '#1e293b',
    fontSize: 12,
  },
  tdSite: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600' as const,
  },
  tdRatio: {
    width: 72,
  },
  rpiPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratioPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  ratioText: {
    fontSize: 13,
    fontWeight: '900' as const,
  },
  rankBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
    backgroundColor: '#0d9488',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  rankText: {
    fontSize: 9,
    fontWeight: '900' as const,
    color: '#fff',
  },
  infoCard: {
    marginHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#334155',
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    marginBottom: 8,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '800' as const,
    color: '#1e293b',
  },
  infoFooter: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 17,
    marginTop: 4,
  },
});
