import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import { DatePicker } from '@/shared/components/DatePicker';
import type { StaffCertification } from '@/domains/hr/domain/Staff';
import type { StaffWizardData } from '../../hooks/useStaffWizard';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = ['Morning (6am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–10pm)'];

interface ScheduleStepProps {
  data: StaffWizardData;
  updateField: <K extends keyof StaffWizardData>(
    field: K,
    value: StaffWizardData[K],
  ) => void;
  addCertification: () => void;
  removeCertification: (index: number) => void;
  onChangeCert: (index: number, field: keyof StaffCertification, value: string) => void;
}

export function ScheduleStep({
  data,
  updateField,
  addCertification,
  removeCertification,
  onChangeCert,
}: ScheduleStepProps) {
  const theme = useTheme();

  const toggleSlot = (day: string, slot: string) => {
    const current = data.schedule[day] ?? [];
    const active = current.includes(slot);
    let updated;
    if (active) {
      updated = current.filter((s) => s !== slot);
    } else {
      updated = [...current, slot];
    }
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
      <FormSection title="Weekly Schedule">
        <Typography variant="bodySmall" style={{ color: theme.textSecondary, marginBottom: Spacing.two }}>
          Select the working days and time slots for this employee
        </Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.gridContainer, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            {/* Header */}
            <View style={[styles.gridRow, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.gridCellDay, { borderBottomWidth: 1, borderRightWidth: 1, borderColor: theme.border }]}>
                <Typography variant="bodySmallBold" style={{ color: theme.textSecondary }}>Day</Typography>
              </View>
              {SLOTS.map((slot) => (
                <View key={slot} style={[styles.gridCellSlot, { borderBottomWidth: 1, borderRightWidth: 1, borderColor: theme.border }]}>
                  <Typography variant="bodySmallBold" style={{ color: theme.textSecondary, textAlign: 'center' }}>
                    {slot}
                  </Typography>
                </View>
              ))}
            </View>
            
            {/* Days */}
            {DAYS.map((day, di) => {
              const activeSlots = data.schedule[day] ?? [];
              return (
                <View key={day} style={[styles.gridRow, { backgroundColor: di % 2 === 0 ? theme.backgroundElement : theme.background }]}>
                  <View style={[styles.gridCellDay, { borderRightWidth: 1, borderBottomWidth: di === DAYS.length - 1 ? 0 : 1, borderColor: theme.border }]}>
                    <Typography variant="bodySmallBold">{day}</Typography>
                  </View>
                  {SLOTS.map((slot) => {
                    const active = activeSlots.includes(slot);
                    return (
                      <View key={slot} style={[styles.gridCellSlot, { borderRightWidth: 1, borderBottomWidth: di === DAYS.length - 1 ? 0 : 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }]}>
                        <Pressable
                          onPress={() => toggleSlot(day, slot)}
                          style={[
                            styles.checkbox,
                            {
                              borderColor: active ? theme.primary : theme.border,
                              backgroundColor: active ? theme.primary : 'transparent',
                            }
                          ]}
                        >
                          {active && <Feather name="check" size={14} color="#fff" />}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: theme.primary }]} />
            <Typography variant="caption" style={{ color: theme.textSecondary }}>Selected</Typography>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { borderColor: theme.border, borderWidth: 2 }]} />
            <Typography variant="caption" style={{ color: theme.textSecondary }}>Not working</Typography>
          </View>
        </View>
      </FormSection>

      <FormSection title="Certifications">
        {data.certifications.length === 0 && (
          <Typography variant="bodySmall" style={{ color: theme.textSecondary, textAlign: 'center', paddingVertical: Spacing.four }}>
            No certifications on file.
          </Typography>
        )}
        {data.certifications.map((cert, index) => (
          <View
            key={index}
            style={[styles.certCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 }]}
          >
            <View style={styles.certHeader}>
              <View style={styles.certHeaderLeft}>
                <View style={[styles.iconWrapper, { backgroundColor: theme.primary + '1a' }]}>
                  <Feather name="award" size={16} color={theme.primary} />
                </View>
                <Typography variant="bodySmallBold">
                  Certification {index + 1}
                </Typography>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => removeCertification(index)}
                style={styles.removeButton}
              >
                <Feather name="x" size={16} color={theme.error} />
              </Pressable>
            </View>
            <View style={styles.certGrid}>
              <View style={styles.certField}>
                <Input
                  label="Certification Name"
                  value={cert.certName}
                  onChangeText={(value) => onChangeCert(index, 'certName', value)}
                  placeholder="e.g. CPT"
                />
              </View>
              <View style={styles.certField}>
                <Input
                  label="Issuer"
                  value={cert.issuer}
                  onChangeText={(value) => onChangeCert(index, 'issuer', value)}
                  placeholder="e.g. ACE"
                />
              </View>
              <View style={styles.certField}>
                <DatePicker
                  label="Issue Date"
                  value={cert.issueDate ? new Date(cert.issueDate) : undefined}
                  onChange={(d) => d && onChangeCert(index, 'issueDate', d.toISOString().split('T')[0])}
                  placeholder="Select Date"
                />
              </View>
              <View style={styles.certField}>
                <DatePicker
                  label="Expiry Date"
                  value={cert.expiryDate ? new Date(cert.expiryDate) : undefined}
                  onChange={(d) => d && onChangeCert(index, 'expiryDate', d.toISOString().split('T')[0])}
                  placeholder="Select Date"
                />
              </View>
            </View>
            
            <View style={{ marginTop: Spacing.three }}>
              <Typography variant="bodySmallBold" style={{ marginBottom: Spacing.one }}>Document</Typography>
              <Button
                variant="outline"
                label={cert.documentUrl ? "Replace Document" : "Upload Document"}
                onPress={() => handlePickDocument(index)}
              />
              {cert.documentUrl ? (
                 <Typography variant="caption" style={{ color: theme.textSecondary, marginTop: Spacing.one }} numberOfLines={1}>
                   {cert.documentUrl.split('/').pop()}
                 </Typography>
              ) : null}
            </View>
          </View>
        ))}
        <Button
          label="+ Add Certification"
          variant="secondary"
          onPress={addCertification}
        />
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  gridContainer: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 460,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCellDay: {
    width: 120,
    padding: Spacing.three,
    justifyContent: 'center',
  },
  gridCellSlot: {
    flex: 1,
    minWidth: 100,
    padding: Spacing.three,
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: Radius.sm,
  },
  certCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  certHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconWrapper: {
    padding: Spacing.one + Spacing.half,
    borderRadius: Radius.sm,
  },
  removeButton: {
    padding: Spacing.half,
  },
  certGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  certField: {
    width: '47%',
  },
});