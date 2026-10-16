import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';
import { GlassBlob, GlassSurface } from '@/shared/components';

import type { EnquiryStatus, MemberEnquiry } from '../enquiriesApi';
import { CategoryIcon, EnquiryColors as C, StatusPill, formatEnquiryDate } from './enquiryUi';

type Filter = 'ALL' | EnquiryStatus;
const FILTERS: Filter[] = ['ALL', 'OPEN', 'REPLIED', 'CLOSED'];

interface EnquiryListViewProps {
  enquiries: MemberEnquiry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onBack: () => void;
  onNew: () => void;
  onOpen: (enquiry: MemberEnquiry) => void;
}

/** "Help & Enquiries": new-enquiry call to action, status counts, and the member's enquiries. */
export function EnquiryListView({
  enquiries, isLoading, isError, isRefetching, onRefresh, onBack, onNew, onOpen,
}: EnquiryListViewProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('ALL');

  const all = useMemo(() => enquiries ?? [], [enquiries]);
  const counts = useMemo(() => ({
    OPEN: all.filter((e) => e.status === 'OPEN').length,
    REPLIED: all.filter((e) => e.status === 'REPLIED').length,
    CLOSED: all.filter((e) => e.status === 'CLOSED').length,
  }), [all]);
  const rows = filter === 'ALL' ? all : all.filter((e) => e.status === filter);
  // Enquiries go to the member's own branch; the newest one names it.
  const branchName = all[0]?.branchName;

  return (
    <View style={styles.container}>
      <GlassBlob color={C.amber} size={320} opacity={0.28} top={70} right={-120} />

      <LinearGradient colors={[C.amberLight, C.amber]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.top}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={styles.round}
          accessibilityRole="button"
          accessibilityLabel={t('shared.goBack')}
        >
          <Feather name="chevron-left" size={20} color={C.ink} />
        </Pressable>
        <View style={styles.flex}>
          {branchName ? <Typography style={styles.topSmall}>{branchName}</Typography> : null}
          <Typography style={styles.topTitle}>{t('enquiries.title')}</Typography>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={C.amber} />}
      >
        <Pressable onPress={onNew} accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
          <LinearGradient colors={[C.tealLight, C.teal]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <View style={styles.ctaIcon}>
              <Feather name="plus" size={20} color="#fff" />
            </View>
            <View style={styles.flex}>
              <Typography style={styles.ctaTitle}>{t('enquiries.newEnquiryCta')}</Typography>
              <Typography style={styles.ctaSub}>{t('enquiries.newEnquiryCtaSubtitle')}</Typography>
            </View>
            <Feather name="chevron-right" size={20} color="#fff" />
          </LinearGradient>
        </Pressable>

        <View style={styles.summary}>
          <SummaryTile value={counts.OPEN} label={t('enquiries.status.OPEN')} />
          <SummaryTile value={counts.REPLIED} label={t('enquiries.status.REPLIED')} accent />
          <SummaryTile value={counts.CLOSED} label={t('enquiries.status.CLOSED')} />
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {FILTERS.map((f) => {
            const on = f === filter;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.tab, on && styles.tabOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Typography style={[styles.tabText, on && styles.tabTextOn]}>{t(`enquiries.tabs.${f}`)}</Typography>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <Loader />
        ) : isError && !enquiries ? (
          <Typography style={styles.empty}>{t('enquiries.loadFailed')}</Typography>
        ) : all.length === 0 ? (
          <View style={styles.emptyBox}>
            <Typography style={styles.emptyTitle}>{t('enquiries.empty')}</Typography>
            <Typography style={styles.empty}>{t('enquiries.emptySubtitle')}</Typography>
          </View>
        ) : rows.length === 0 ? (
          <Typography style={styles.empty}>{t('enquiries.nothingHere')}</Typography>
        ) : (
          <View style={styles.list}>
            {rows.map((e) => (
              <EnquiryCard key={e.id} enquiry={e} onPress={() => onOpen(e)} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryTile({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <GlassSurface radius={18} style={styles.tile}>
      <Typography style={[styles.tileValue, accent && { color: C.teal }]}>{value}</Typography>
      <Typography style={styles.tileLabel} numberOfLines={1}>{label}</Typography>
    </GlassSurface>
  );
}

function EnquiryCard({ enquiry: e, onPress }: { enquiry: MemberEnquiry; onPress: () => void }) {
  const { t } = useTranslation();
  const gym = e.branchName ?? t('enquiries.gymFallback');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
      <GlassSurface radius={22} style={styles.card}>
        <View style={styles.row1}>
          <CategoryIcon category={e.category} />
          <Typography style={styles.cardTitle} numberOfLines={1}>{e.subject}</Typography>
        </View>
        <Typography style={styles.preview} numberOfLines={2}>
          {e.reply ? (
            <>
              <Typography style={styles.previewWho}>{gym}: </Typography>
              {e.reply}
            </>
          ) : (
            `${t('enquiries.youPrefix')} ${e.message}`
          )}
        </Typography>
        <View style={styles.meta}>
          <Typography style={styles.metaText} numberOfLines={1}>
            {t('enquiries.reference', { id: e.id })} · {t(`enquiries.categories.${e.category}`)} · {formatEnquiryDate(e.createdAt, 'MMM d')}
          </Typography>
          <StatusPill status={e.status} />
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  top: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: C.amber,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSmall: { fontSize: 12, fontWeight: '600', color: C.amberInk },
  topTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  scroll: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.six },
  cta: {
    padding: 18,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ctaIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  summary: { flexDirection: 'row', gap: 10, marginTop: 14 },
  tile: { flex: 1, padding: 12, alignItems: 'center' },
  tileValue: { fontSize: 20, fontWeight: '800', color: C.ink },
  tileLabel: { fontSize: 11, fontWeight: '700', color: C.muted },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    padding: 4,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(42,36,24,0.06)',
  },
  tab: { flex: 1, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  tabOn: {
    backgroundColor: '#fff',
    shadowColor: '#281e00',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '700', color: C.muted },
  tabTextOn: { color: C.ink },
  list: { gap: 10, marginTop: Spacing.md },
  card: { padding: 14, gap: 8 },
  row1: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: C.ink },
  preview: { fontSize: 13, lineHeight: 18, color: '#4a4230' },
  previewWho: { fontSize: 13, fontWeight: '700', color: C.teal },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metaText: { flex: 1, fontSize: 11, fontWeight: '600', color: C.muted },
  emptyBox: { paddingVertical: 40, gap: 6 },
  emptyTitle: { textAlign: 'center', fontSize: 15, fontWeight: '800', color: C.ink },
  empty: { textAlign: 'center', fontSize: 14, color: C.muted, paddingVertical: Spacing.two },
});
