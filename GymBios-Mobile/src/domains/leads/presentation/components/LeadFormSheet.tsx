import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/Dropdown';
import { FormSheet, FormSheetSection } from '@/shared/components/FormSheet';
import { Input } from '@/shared/components/Input';
import { TrafficLightSelector } from '@/shared/components/TrafficLightSelector';
import { Typography } from '@/shared/components/Typography';
import type { Lead, LeadPriority, LeadSource, LeadStatus } from '../../domain/Lead';

export interface LeadFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  priority: LeadPriority;
  leadScore?: number;
  assignedStaff?: string;
  notes?: string;
}

interface LeadFormSheetProps {
  visible: boolean;
  /** The lead being edited; omit to create a new one. */
  lead?: Lead | null;
  staffOptions: { label: string; value: string }[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: LeadFormValues) => void;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: '#3b82f6',
  contacted: '#eab308',
  'follow-up': '#f97316',
  converted: '#16a34a',
  lost: '#ef4444',
};

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  status: 'new' as LeadStatus,
  source: 'website' as LeadSource,
  priority: 'medium' as LeadPriority,
  leadScore: '',
  assignedStaff: '',
  notes: '',
};

function formFromLead(lead?: Lead | null) {
  if (!lead) return emptyForm;
  return {
    firstName: lead.firstName || '',
    lastName: lead.lastName || '',
    email: lead.email || '',
    phone: lead.phone || '',
    status: lead.status || 'new',
    source: lead.source || 'website',
    priority: lead.priority || 'medium',
    leadScore: lead.leadScore != null ? String(lead.leadScore) : '',
    assignedStaff: lead.assignedStaff || '',
    notes: lead.notes || '',
  };
}

export function LeadFormSheet({
  visible,
  lead,
  staffOptions,
  submitting = false,
  onClose,
  onSubmit,
}: LeadFormSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isEdit = !!lead;

  const [form, setForm] = useState(() => formFromLead(lead));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset whenever the sheet opens (or switches lead), so it never shows stale values.
  // Done during render rather than in an effect to avoid a flash of the old form.
  const openKey = visible ? String(lead?.id ?? 'new') : null;
  const [lastOpenKey, setLastOpenKey] = useState(openKey);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) {
      setForm(formFromLead(lead));
      setErrors({});
    }
  }

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const statusOptions = useMemo(
    () => [
      { label: t('leads.statuses.new'), value: 'new' as const },
      { label: t('leads.statuses.contacted'), value: 'contacted' as const },
      { label: t('leads.statuses.followUp'), value: 'follow-up' as const },
      { label: t('leads.statuses.converted'), value: 'converted' as const },
      { label: t('leads.statuses.lost'), value: 'lost' as const },
    ],
    [t],
  );

  const sourceOptions = useMemo(
    () => [
      { label: t('leads.sources.website'), value: 'website' },
      { label: t('leads.sources.referral'), value: 'referral' },
      { label: t('leads.sources.walkIn'), value: 'walk-in' },
      { label: t('leads.sources.socialMedia'), value: 'social-media' },
      { label: t('leads.sources.phone'), value: 'phone' },
      { label: t('leads.sources.campaign'), value: 'campaign' },
      { label: t('leads.sources.other'), value: 'other' },
    ],
    [t],
  );

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.firstName.trim()) nextErrors.firstName = t('leads.form.firstNameRequired');

    // Lead score is optional and set manually (1-100), matching the web.
    let leadScore: number | undefined;
    if (form.leadScore.trim()) {
      const value = Number(form.leadScore);
      if (!Number.isInteger(value) || value < 1 || value > 100) {
        nextErrors.leadScore = t('leads.form.leadScoreInvalid');
      } else {
        leadScore = value;
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      status: form.status,
      source: form.source,
      priority: form.priority,
      leadScore,
      assignedStaff: form.assignedStaff.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <FormSheet
      visible={visible}
      title={isEdit ? t('leads.form.editLead') : t('leads.form.addNewLead')}
      subtitle={t('leads.form.fillDetails')}
      icon={isEdit ? 'edit-2' : 'user-plus'}
      closeLabel={t('leads.form.cancel')}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="outline"
            label={t('leads.form.cancel')}
            onPress={onClose}
            disabled={submitting}
            style={styles.flex}
          />
          <Button
            label={isEdit ? t('leads.form.saveChanges') : t('leads.form.createLead')}
            onPress={handleSubmit}
            loading={submitting}
            style={styles.primaryButton}
          />
        </>
      }
    >
              {/* Contact */}
              <FormSheetSection label={t('leads.form.contactDetails')} />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Input
                    label={t('leads.form.firstName')}
                    placeholder={t('leads.form.firstNamePlaceholder')}
                    value={form.firstName}
                    onChangeText={v => update('firstName', v)}
                    error={errors.firstName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.flex}>
                  <Input
                    label={t('leads.form.lastName')}
                    placeholder={t('leads.form.lastNamePlaceholder')}
                    value={form.lastName}
                    onChangeText={v => update('lastName', v)}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <Input
                label={t('leads.form.phoneLabel')}
                placeholder={t('leads.form.phonePlaceholder')}
                value={form.phone}
                onChangeText={v => update('phone', v)}
                keyboardType="phone-pad"
              />
              <Input
                label={t('leads.form.emailLabel')}
                placeholder={t('leads.form.emailPlaceholder')}
                value={form.email}
                onChangeText={v => update('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Lead details */}
              <FormSheetSection label={t('leads.form.leadDetailsSection')} />
              <Typography variant="bodySmallBold" style={[styles.fieldLabel, { color: theme.text }]}>
                {t('leads.form.status')}
              </Typography>
              <View style={styles.chips}>
                {statusOptions.map(opt => {
                  const active = form.status === opt.value;
                  const color = STATUS_COLORS[opt.value];
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => update('status', opt.value)}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? color : theme.border,
                          backgroundColor: active ? `${color}1f` : theme.backgroundElement,
                        },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <View style={[styles.chipDot, { backgroundColor: color }]} />
                      <Typography
                        variant="caption"
                        style={{
                          color: active ? color : theme.textSecondary,
                          fontWeight: active ? '700' : '500',
                        }}
                      >
                        {opt.label}
                      </Typography>
                    </Pressable>
                  );
                })}
              </View>

              <TrafficLightSelector
                label={t('leads.form.priority')}
                value={form.priority as 'low' | 'medium' | 'high'}
                onChange={v => update('priority', v)}
              />

              <Dropdown
                label={t('leads.form.source')}
                value={form.source}
                options={sourceOptions}
                onChange={v => update('source', v as LeadSource)}
              />

              <Input
                label={t('leads.form.leadScoreLabel')}
                placeholder={t('leads.form.leadScorePlaceholder')}
                value={form.leadScore}
                onChangeText={v => update('leadScore', v.replace(/[^0-9]/g, '').slice(0, 3))}
                keyboardType="number-pad"
                error={errors.leadScore}
              />

              <Dropdown
                label={t('leads.form.assignedStaff')}
                placeholder={t('leads.management.selectStaffPlaceholder')}
                value={form.assignedStaff}
                options={staffOptions}
                onChange={v => update('assignedStaff', v)}
              />

              {/* Notes */}
              <FormSheetSection label={t('leads.form.notesSection')} />
              <Input
                placeholder={t('leads.form.notesPlaceholder')}
                value={form.notes}
                onChangeText={v => update('notes', v)}
                multiline
                numberOfLines={3}
                style={styles.notes}
              />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  fieldLabel: {
    marginBottom: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    flex: 2,
  },
});
