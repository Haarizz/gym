import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { GlassSurface } from '@/shared/components';

import type { MemberEnquiry } from '../enquiriesApi';
import { CategoryIcon, EnquiryColors as C, StatusPill, formatEnquiryDate } from './enquiryUi';

interface EnquiryDetailViewProps {
  enquiry: MemberEnquiry;
  isRefetching: boolean;
  onRefresh: () => void;
  onBack: () => void;
  onNew: () => void;
}

const sameDay = (a: string | null, b: string | null) =>
  !!a && !!b && new Date(a).toDateString() === new Date(b).toDateString();

/** One enquiry: the member's message, the gym's one reply, and where it stands. */
export function EnquiryDetailView({ enquiry: e, isRefetching, onRefresh, onBack, onNew }: EnquiryDetailViewProps) {
  const { t } = useTranslation();
  const gym = e.branchName ?? t('enquiries.gymFallback');
  const replied = !!e.reply;
  const closed = e.status === 'CLOSED';
  const steps: [string, boolean][] = [
    [t('enquiries.steps.submitted'), true],
    [t('enquiries.steps.replied'), replied],
    [t('enquiries.steps.closed'), closed],
  ];

  return (
    <View style={styles.container}>
      <GlassSurface radius={24} style={styles.head}>
        <View style={styles.r1}>
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel={t('shared.goBack')}
          >
            <Feather name="chevron-left" size={20} color={C.ink} />
          </Pressable>
          <CategoryIcon category={e.category} />
          <Typography style={styles.headTitle} numberOfLines={2}>{e.subject}</Typography>
        </View>
        <View style={styles.r2}>
          <StatusPill status={e.status} />
          <Typography style={styles.r2Text}>
            {t('enquiries.reference', { id: e.id })} · {t(`enquiries.categories.${e.category}`)} · {t('enquiries.openedOn', { date: formatEnquiryDate(e.createdAt, 'MMM d') })}
          </Typography>
        </View>
      </GlassSurface>

      <GlassSurface radius={18} style={styles.steps}>
        {steps.map(([label, done], i) => (
          <Fragment key={label}>
            {i > 0 && <View style={[styles.line, done && styles.lineDone]} />}
            <View style={styles.step}>
              <View style={[styles.stepDot, done && styles.stepDotDone]}>
                {done ? <Feather name="check" size={12} color="#fff" /> : <Typography style={styles.stepNum}>{i + 1}</Typography>}
              </View>
              <Typography style={[styles.stepText, done && styles.stepTextDone]}>{label}</Typography>
            </View>
          </Fragment>
        ))}
      </GlassSurface>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.msgs}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={C.amber} />}
      >
        <DayChip iso={e.createdAt} />
        <View style={[styles.m, styles.mMe]}>
          <View style={[styles.bub, styles.bubMe]}>
            <Typography style={styles.bubMeText}>{e.message}</Typography>
          </View>
          <Typography style={styles.time}>{formatEnquiryDate(e.createdAt, 'p')}</Typography>
        </View>

        {replied ? (
          <>
            {!sameDay(e.createdAt, e.repliedAt) && <DayChip iso={e.repliedAt} />}
            <View style={[styles.m, styles.mStaff]}>
              <View style={styles.who}>
                <Typography style={styles.whoText}>{gym}</Typography>
                <View style={styles.badge}>
                  <Typography style={styles.badgeText}>{t('enquiries.gymBadge')}</Typography>
                </View>
              </View>
              <View style={[styles.bub, styles.bubStaff]}>
                <Typography style={styles.bubStaffText}>{e.reply}</Typography>
              </View>
              <Typography style={styles.time}>{formatEnquiryDate(e.repliedAt, 'p')}</Typography>
            </View>
          </>
        ) : !closed ? (
          <SystemLine icon="clock" text={t('enquiries.received')} />
        ) : null}

        {closed && (
          <SystemLine icon="lock" text={t('enquiries.closedOn', { date: formatEnquiryDate(e.closedAt, 'PP') })} />
        )}
      </ScrollView>

      {e.status !== 'OPEN' && (
        <GlassSurface radius={22} style={styles.foot}>
          <Typography style={styles.footText}>
            {closed ? t('enquiries.closedFooter') : t('enquiries.followUpHint')}
          </Typography>
          <Pressable onPress={onNew} accessibilityRole="button" hitSlop={6}>
            <Typography style={styles.footLink}>{t('enquiries.raiseNew')}</Typography>
          </Pressable>
        </GlassSurface>
      )}
    </View>
  );
}

function DayChip({ iso }: { iso: string | null }) {
  const label = formatEnquiryDate(iso, 'EEE, MMM d');
  if (!label) return null;
  return (
    <View style={styles.day}>
      <Typography style={styles.dayText}>{label}</Typography>
    </View>
  );
}

function SystemLine({ icon, text }: { icon: 'clock' | 'lock'; text: string }) {
  return (
    <View style={styles.sys}>
      <Feather name={icon} size={13} color={C.muted} />
      <Typography style={styles.sysText}>{text}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  head: { marginHorizontal: 12, marginTop: 12, paddingVertical: 12, paddingHorizontal: 14 },
  r1: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  headTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: C.ink },
  r2: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  r2Text: { flexShrink: 1, fontSize: 11, fontWeight: '600', color: C.muted },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: Spacing.three,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E3DCCB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: C.teal },
  stepNum: { fontSize: 11, fontWeight: '700', color: '#fff' },
  stepText: { fontSize: 11, fontWeight: '700', color: '#a49a85' },
  stepTextDone: { color: C.ink },
  line: { flex: 1, height: 2, borderRadius: 2, backgroundColor: '#E3DCCB' },
  lineDone: { backgroundColor: C.teal },
  msgs: { paddingHorizontal: Spacing.three, paddingVertical: 14, gap: 10 },
  day: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  dayText: { fontSize: 11, fontWeight: '700', color: C.muted },
  m: { maxWidth: '84%', gap: 4 },
  mMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  mStaff: { alignSelf: 'flex-start' },
  bub: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 20 },
  bubMe: { backgroundColor: C.ink, borderBottomRightRadius: 6 },
  bubMeText: { fontSize: 14, lineHeight: 21, color: '#fff' },
  bubStaff: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    borderBottomLeftRadius: 6,
    shadowColor: '#281e00',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bubStaffText: { fontSize: 14, lineHeight: 21, color: C.ink },
  who: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  whoText: { fontSize: 11, fontWeight: '700', color: C.muted },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: C.tealSoft },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, color: '#24564A' },
  time: { fontSize: 10, fontWeight: '600', color: C.muted },
  sys: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.three },
  sysText: { fontSize: 12, fontWeight: '600', color: C.muted, textAlign: 'center', flexShrink: 1 },
  foot: {
    marginHorizontal: 12,
    marginBottom: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  footText: { fontSize: 13, fontWeight: '600', color: C.muted, textAlign: 'center' },
  footLink: { fontSize: 13, fontWeight: '800', color: C.teal, textDecorationLine: 'underline' },
});
