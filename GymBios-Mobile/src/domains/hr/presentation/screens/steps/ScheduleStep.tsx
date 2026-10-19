import Feather from '@expo/vector-icons/Feather';
import { format, parseISO } from 'date-fns';
import { Pressable, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { DatePicker } from '@/shared/components/DatePicker';
import { FormCard } from '@/domains/members/presentation/components/form/FormCard';
import type { StaffCertification } from '@/domains/hr/domain/Staff';
import type { StaffStepProps } from './stepTypes';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// `value` is what gets stored on the schedule, so it must not change.
const SLOTS = [
  { value: 'Morning (6am–12pm)', label: 'Morning', hint: '6am–12pm' },
  { value: 'Afternoon (12pm–5pm)', label: 'Afternoon', hint: '12pm–5pm' },
  { value: 'Evening (5pm–10pm)', label: 'Evening', hint: '5pm–10pm' },
];

interface ScheduleStepProps extends StaffStepProps {
  addCertification: () => void;
  removeCertification: (index: number) => void;
  onChangeCert: (index: number, field: keyof StaffCertification, value: string) => void;
}

const toDate = (value: string) => (value ? parseISO(value) : undefined);
const toDateString = (d: Date | null) => (d ? format(d, 'yyyy-MM-dd') : '');

export function ScheduleStep({
  data,
  updateField,
  addCertification,
  removeCertification,
  onChangeCert,
}: ScheduleStepProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const workingDays = DAYS.filter((day) => (data.schedule[day] ?? []).length > 0).length;

  const toggleSlot = (day: string, slot: string) => {
    const current = data.schedule[day] ?? [];
    const updated = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot];
    const newSchedule = { ...data.schedule };
    if (updated.length === 0) {
      delete newSchedule[day];
    } else {
      newSchedule[day] = updated;
    }
    updateField('schedule', newSchedule);
  };

  const handlePickDocument = async (index: number) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onChangeCert(index, 'documentUrl', result.assets[0].uri);
      }
    } catch (err) {
      console.log('Error picking document', err);
    }
  };

  return (
    <View style={styles.container}>
      <FormCard
        icon="calendar"
        title={t('hr.scheduleStep.weeklySchedule')}
        description={
          workingDays
            ? (workingDays === 1
                ? t('hr.scheduleStep.workingDays_one', { count: workingDays })
                : t('hr.scheduleStep.workingDays_other', { count: workingDays }))
            : t('hr.scheduleStep.noWorkingDays')
        }
      >
        {DAYS.map((day) => {
          const activeSlots = data.schedule[day] ?? [];
          return (
            <View key={day} style={styles.dayRow}>
              <Typography
                variant="bodySmallBold"
                style={[styles.dayLabel, { color: activeSlots.length ? theme.text : theme.textSecondary }]}
              >
                {day.slice(0, 3)}
              </Typography>
              <View style={styles.slots}>
                {SLOTS.map((slot) => {
                  const selected = activeSlots.includes(slot.value);
                  return (
                    <Pressable
                      key={slot.value}
                      onPress={() => toggleSlot(day, slot.value)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${day} ${slot.label} ${slot.hint}`}
                      style={({ pressed }) => [
                        styles.slot,
                        {
                          borderColor: selected ? theme.primary : theme.border,
                          backgroundColor: selected ? 'rgba(50,127,116,0.10)' : theme.backgroundElement,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Typography
                        variant="caption"
                        numberOfLines={1}
                        style={[styles.slotLabel, { color: selected ? theme.primary : theme.textSecondary }]}
                      >
                        {slot.label}
                      </Typography>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
        <Typography variant="caption" color="textSecondary">
          {t('hr.scheduleStep.timeHint')}
        </Typography>
      </FormCard>

      <FormCard
        icon="award"
        title={t('hr.certifications')}
        description={
          data.certifications.length
            ? (data.certifications.length === 1
                ? t('hr.scheduleStep.certificationsDesc_one', { count: data.certifications.length })
                : t('hr.scheduleStep.certificationsDesc_other', { count: data.certifications.length }))
            : t('hr.scheduleStep.noCertificationsDesc')
        }
      >
        {data.certifications.map((cert, index) => (
          <View key={index} style={[styles.certCard, { borderColor: theme.border }]}>
            <View style={styles.certHeader}>
              <Typography variant="bodySmallBold" style={styles.certTitle} numberOfLines={1}>
                {cert.certName.trim() || t('hr.scheduleStep.certNumber', { number: index + 1 })}
              </Typography>
              <Pressable
                hitSlop={10}
                onPress={() => removeCertification(index)}
                accessibilityRole="button"
                accessibilityLabel={t('hr.scheduleStep.removeCertA11y', { number: index + 1 })}
                style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
              >
                <Feather name="trash-2" size={15} color={theme.error} />
              </Pressable>
            </View>

            <Input
              label={t('hr.scheduleStep.certName')}
              value={cert.certName}
              onChangeText={(value) => onChangeCert(index, 'certName', value)}
              placeholder={t('hr.scheduleStep.certNamePlaceholder')}
            />
            <Input
              label={t('hr.scheduleStep.issuer')}
              value={cert.issuer}
              onChangeText={(value) => onChangeCert(index, 'issuer', value)}
              placeholder={t('hr.scheduleStep.issuerPlaceholder')}
            />
            <View style={styles.dateRow}>
              <DatePicker
                label={t('hr.scheduleStep.issued')}
                placeholder={t('hr.scheduleStep.select')}
                value={toDate(cert.issueDate)}
                onChange={(d) => onChangeCert(index, 'issueDate', toDateString(d))}
                style={styles.dateField}
              />
              <DatePicker
                label={t('hr.scheduleStep.expires')}
                placeholder={t('hr.scheduleStep.select')}
                value={toDate(cert.expiryDate)}
                minimumDate={toDate(cert.issueDate)}
                onChange={(d) => onChangeCert(index, 'expiryDate', toDateString(d))}
                style={styles.dateField}
              />
            </View>

            <Pressable
              onPress={() => handlePickDocument(index)}
              accessibilityRole="button"
              accessibilityLabel={cert.documentUrl ? t('hr.scheduleStep.replace') : t('hr.scheduleStep.uploadDocument')}
              style={({ pressed }) => [
                styles.docButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <Feather
                name={cert.documentUrl ? 'file-text' : 'upload'}
                size={16}
                color={BrandColors.teal}
              />
              <Typography variant="bodySmall" style={styles.docText} numberOfLines={1}>
                {cert.documentUrl ? cert.documentUrl.split('/').pop() : t('hr.scheduleStep.uploadDocument')}
              </Typography>
              {cert.documentUrl ? (
                <Typography variant="caption" style={[styles.docAction, { color: theme.primary }]}>
                  {t('hr.scheduleStep.replace')}
                </Typography>
              ) : null}
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={addCertification}
          accessibilityRole="button"
          accessibilityLabel={t('hr.scheduleStep.addCertification')}
          style={({ pressed }) => [
            styles.addButton,
            { borderColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          <Feather name="plus" size={16} color={theme.primary} />
          <Typography variant="bodySmallBold" style={{ color: theme.primary }}>
            {t('hr.scheduleStep.addCertification')}
          </Typography>
        </Pressable>
      </FormCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.md,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dayLabel: {
    width: 36,
  },
  slots: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  slotLabel: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  certCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  certTitle: {
    flex: 1,
  },
  removeButton: {
    padding: Spacing.one,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateField: {
    flex: 1,
  },
  docButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  docText: {
    flex: 1,
  },
  docAction: {
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
