import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as WebBrowser from 'expo-web-browser';
import { isBefore, parseISO, startOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { GlassSurface, InfoRow, StatusBadge, Typography } from '@/shared/components';
import { toast } from '@/shared/components/Toasts/toastStore';
import { resolveImageUrl } from '@/shared/utils/resolveImageUrl';
import { formatDate } from '@/core/i18n';

import type { StaffCertification, StaffProfile } from '../../domain';

// Same day order and slot labels the admin picks from on the web Staffs & Trainers page.
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DAY_KEYS: Record<string, string> = {
  Monday: 'mon',
  Tuesday: 'tue',
  Wednesday: 'wed',
  Thursday: 'thu',
  Friday: 'fri',
  Saturday: 'sat',
  Sunday: 'sun',
};

function formatJoinDate(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return formatDate(value, 'PP');
  } catch {
    return value;
  }
}

function isExpired(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  try {
    return isBefore(parseISO(expiryDate), startOfDay(new Date()));
  } catch {
    return false;
  }
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassSurface radius={Radius.lg} style={styles.card}>
      <Typography variant="subtitle" style={styles.cardTitle}>
        {title}
      </Typography>
      {children}
    </GlassSurface>
  );
}

export function EmploymentCard({ staff }: { staff: StaffProfile }) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('staff.employmentDetails')}>
      <InfoRow icon="hash" label={t('staff.employeeId')} value={staff.staffId} divider={false} />
      <InfoRow icon="briefcase" label={t('staff.role')} value={staff.role} />
      <InfoRow icon="layers" label={t('staff.department')} value={staff.department} />
      <InfoRow icon="home" label={t('staff.branch')} value={staff.branch} />
      <InfoRow icon="calendar" label={t('staff.joinDate')} value={formatJoinDate(staff.joinDate)} />
      <InfoRow
        icon="activity"
        label={t('staff.status')}
        value={staff.status ? <StatusBadge status={staff.status.replace(/_/g, ' ')} /> : undefined}
      />
      <InfoRow
        icon="target"
        label={t('staff.monthlyTarget')}
        value={staff.monthlyTarget != null ? <CurrencyValue amount={staff.monthlyTarget} /> : undefined}
      />
      <InfoRow
        icon="credit-card"
        label={t('staff.baseSalary')}
        value={staff.baseSalary != null ? <CurrencyValue amount={staff.baseSalary} /> : undefined}
      />
      <InfoRow icon="at-sign" label={t('staff.appUsername')} value={staff.appUsername} />
    </SectionCard>
  );
}

async function openDocument(url: string, errorTitle: string, errorMsg: string) {
  const resolved = resolveImageUrl(url);
  if (!resolved) return;
  try {
    await WebBrowser.openBrowserAsync(resolved);
  } catch {
    toast.error(errorMsg, { title: errorTitle });
  }
}

function CertificationRow({ cert, divider }: { cert: StaffCertification; divider: boolean }) {
  const { t } = useTranslation();
  const expired = isExpired(cert.expiryDate);
  const issued = cert.issueDate ? formatDate(cert.issueDate, 'PP') : undefined;
  const expires = cert.expiryDate ? formatDate(cert.expiryDate, 'PP') : undefined;
  const documentUrl = cert.documentUrl;
  const certName = cert.name || t('staff.untitledCertification');

  return (
    <View style={[styles.certRow, divider && styles.divider]}>
      <View style={styles.certIcon}>
        <Feather name="award" size={16} color={BrandColors.tealDark} />
      </View>
      <View style={styles.certBody}>
        <Typography variant="body" style={styles.certName}>
          {certName}
        </Typography>
        {cert.issuer ? (
          <Typography variant="caption" color="textSecondary">
            {cert.issuer}
          </Typography>
        ) : null}
        {issued || expires ? (
          <Typography variant="caption" color="textSecondary">
            {[
              issued && t('staff.issued', { date: issued }),
              expires && (expired ? t('staff.expired', { date: expires }) : t('staff.validUntil', { date: expires })),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        ) : null}
        {expired ? (
          <Typography variant="caption" style={styles.expiredText}>
            {t('staff.expiredNotice')}
          </Typography>
        ) : null}
      </View>
      {documentUrl ? (
        <Pressable
          onPress={() => openDocument(documentUrl, t('myProfile.errorTitle'), t('staff.certOpenError'))}
          style={styles.viewPill}
          accessibilityRole="button"
          accessibilityLabel={t('staff.viewCertA11y', { name: certName })}
        >
          <Feather name="file-text" size={12} color={BrandColors.tealDark} />
          <Typography variant="caption" style={styles.viewPillText}>
            {t('staff.view')}
          </Typography>
        </Pressable>
      ) : (
        <Typography variant="caption" color="textSecondary" style={styles.noFile}>
          {t('staff.noFile')}
        </Typography>
      )}
    </View>
  );
}

export function CertificationsCard({ certifications }: { certifications: StaffCertification[] }) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('staff.certifications')}>
      {certifications.length === 0 ? (
        <Typography variant="bodySmall" color="textSecondary" style={styles.empty}>
          {t('staff.noCertifications')}
        </Typography>
      ) : (
        certifications.map((cert, i) => <CertificationRow key={cert.id ?? i} cert={cert} divider={i > 0} />)
      )}
    </SectionCard>
  );
}

function splitSlot(slot: string): { name: string; time?: string } {
  // "Morning (6am–12pm)" → { name: "Morning", time: "6am–12pm" }
  const match = slot.match(/^(.*?)\s*\((.*)\)\s*$/);
  return match ? { name: match[1], time: match[2] } : { name: slot };
}

export function ScheduleCard({ schedule }: { schedule: Record<string, string[]> }) {
  const { t } = useTranslation();
  const hasAny = DAYS.some((day) => (schedule[day] ?? []).length > 0);

  return (
    <SectionCard title={t('staff.workSchedule')}>
      {!hasAny ? (
        <Typography variant="bodySmall" color="textSecondary" style={styles.empty}>
          {t('staff.noScheduleConfigured')}
        </Typography>
      ) : (
        DAYS.map((day, i) => {
          const slots = schedule[day] ?? [];
          return (
            <View key={day} style={[styles.dayRow, i > 0 && styles.divider]}>
              <Typography variant="bodySmallBold" style={styles.dayLabel}>
                {t(`staff.days.${DAY_KEYS[day]}` as any)}
              </Typography>
              <View style={styles.slotWrap}>
                {slots.length === 0 ? (
                  <Typography variant="caption" color="textSecondary" style={styles.offText}>
                    {t('staff.off')}
                  </Typography>
                ) : (
                  slots.map((slot) => {
                    const { name, time } = splitSlot(slot);
                    return (
                      <View key={slot} style={styles.slotChip}>
                        <Typography variant="caption" style={styles.slotName}>
                          {name}
                        </Typography>
                        {time ? (
                          <Typography variant="caption" color="textSecondary" style={styles.slotTime}>
                            {time}
                          </Typography>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          );
        })
      )}
    </SectionCard>
  );
}

const HAIRLINE = 'rgba(30,42,58,0.07)';

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
  },
  empty: {
    paddingVertical: Spacing.two,
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  certIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(50,127,116,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certBody: {
    flex: 1,
    gap: 2,
  },
  certName: {
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  expiredText: {
    color: BrandColors.danger,
    fontWeight: '600',
  },
  viewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(50,127,116,0.25)',
  },
  viewPillText: {
    color: BrandColors.tealDark,
    fontWeight: '700',
  },
  noFile: {
    fontStyle: 'italic',
    paddingTop: Spacing.two,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  dayLabel: {
    width: 40,
    color: BrandColors.textPrimary,
  },
  slotWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  offText: {
    fontStyle: 'italic',
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(50,127,116,0.1)',
  },
  slotName: {
    color: BrandColors.tealDark,
    fontWeight: '700',
  },
  slotTime: {
    fontSize: 11,
  },
});
