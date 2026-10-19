import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { useRouter, useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import {
  Typography,
  Input,
  Dropdown,
  DatePicker,
  TimePicker,
  TrafficLightSelector,
} from '@/shared/components';
import { SlideIn } from '@/shared/components/Animations/SlideIn';
import { useAddLead } from '../../hooks/useAddLead';

export function AddLeadScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { addLead, isAdding } = useAddLead();
  const [isExiting, setIsExiting] = useState(false);

  const sourceOptions = useMemo(() => [
    { label: t('leads.sources.website'), value: 'website' },
    { label: t('leads.sources.referral'), value: 'referral' },
    { label: t('leads.sources.walkIn'), value: 'walk-in' },
    { label: t('leads.sources.socialMedia'), value: 'social-media' },
    { label: t('leads.sources.googleAds'), value: 'google-ads' },
    { label: t('leads.sources.facebookAds'), value: 'facebook-ads' },
  ], [t]);

  const followUpTypeOptions = useMemo(() => [
    { label: t('leads.followUpTypes.call'), value: 'call' },
    { label: t('leads.followUpTypes.email'), value: 'email' },
    { label: t('leads.followUpTypes.sms'), value: 'sms' },
    { label: t('leads.followUpTypes.whatsapp'), value: 'whatsapp' },
    { label: t('leads.followUpTypes.inApp'), value: 'in_app' },
    { label: t('leads.followUpTypes.meeting'), value: 'meeting' },
    { label: t('leads.followUpTypes.visit'), value: 'visit' },
  ], [t]);

  const durationOptions = useMemo(() => [
    { label: t('leads.durations.min15'), value: '15' },
    { label: t('leads.durations.min30'), value: '30' },
    { label: t('leads.durations.min45'), value: '45' },
    { label: t('leads.durations.hour1'), value: '60' },
  ], [t]);

  useFocusEffect(
    React.useCallback(() => {
      setIsExiting(false);
    }, [])
  );

  const handleBack = () => {
    setIsExiting(true);
    setTimeout(() => {
      router.back();
    }, 400); // match duration
  };

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: '',
    priority: '' as 'low' | 'medium' | 'high' | '',
    followUpType: '',
    followUpSubject: '',
    followUpDueDate: null as Date | null,
    followUpScheduledTime: '',
    followUpEstimatedDuration: '',
    notes: '',
    followUpPriority: '' as 'low' | 'medium' | 'high' | '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateForm = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.firstName.trim()) newErrors.firstName = t('leads.form.requiredField');
    if (!form.lastName.trim()) newErrors.lastName = t('leads.form.requiredField');
    if (!form.phone.trim()) newErrors.phone = t('leads.form.requiredField');
    if (!form.source) newErrors.source = t('leads.form.requiredField');
    if (!form.priority) newErrors.priority = t('leads.form.requiredField');
    if (!form.followUpType) newErrors.followUpType = t('leads.form.requiredField');
    if (!form.followUpDueDate) newErrors.followUpDueDate = t('leads.form.requiredField');
    if (!form.followUpScheduledTime) newErrors.followUpScheduledTime = t('leads.form.requiredField');
    if (!form.followUpPriority) newErrors.followUpPriority = t('leads.form.requiredField');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await addLead({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone,
        source: form.source,
        priority: form.priority as 'low' | 'medium' | 'high',
        notes: form.notes || undefined,
        followUpType: form.followUpType,
        followUpSubject: form.followUpSubject || t('leads.statuses.followUp'),
        // Local calendar date — toISOString() would shift it back a day in timezones ahead of UTC.
        followUpDueDate: format(form.followUpDueDate!, 'yyyy-MM-dd') + 'T00:00:00',
        followUpScheduledTime: form.followUpScheduledTime || undefined,
        followUpEstimatedDuration: form.followUpEstimatedDuration ? parseInt(form.followUpEstimatedDuration, 10) : undefined,
        followUpPriority: form.followUpPriority as 'low' | 'medium' | 'high',
      });
      router.back();
    } catch (error) {
      console.error('Failed to add lead', error);
      // Display error toast or alert in a real app
    }
  };

  return (
    <SlideIn right duration={400} isExiting={isExiting} style={styles.slideIn}>
      <View style={styles.container}>
        {/* Custom Header */}
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            disabled={isAdding || isExiting}
          >
            <Feather name="chevron-left" size={24} color="#FFF" />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Typography variant="title" style={styles.headerTitle}>
              {t('leads.form.addNewLead')}
            </Typography>
            <Typography variant="bodySmall" style={styles.headerSubtitle}>
              {t('leads.form.fillDetails')}
            </Typography>
          </View>
        </View>

        <ScrollView
          style={styles.formBody}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Contact Details */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.dot} />
              <Typography variant="bodySmallBold" style={styles.sectionTitle}>
                {t('leads.form.contactDetails')}
              </Typography>
            </View>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Input
                  label={t('leads.form.firstName')}
                  placeholder={t('leads.form.firstNamePlaceholder')}
                  value={form.firstName}
                  onChangeText={(val) => updateForm('firstName', val)}
                  error={errors.firstName}
                />
              </View>
              <View style={styles.flex1}>
                <Input
                  label={t('leads.form.lastName')}
                  placeholder={t('leads.form.lastNamePlaceholder')}
                  value={form.lastName}
                  onChangeText={(val) => updateForm('lastName', val)}
                  error={errors.lastName}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Input
                  label={t('leads.form.emailLabel')}
                  placeholder={t('leads.form.emailPlaceholder')}
                  value={form.email}
                  onChangeText={(val) => updateForm('email', val)}
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.flex1}>
                <Input
                  label={t('leads.form.phoneLabel')}
                  placeholder={t('leads.form.phonePlaceholder')}
                  value={form.phone}
                  onChangeText={(val) => updateForm('phone', val)}
                  error={errors.phone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* Lead Details */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.dot} />
              <Typography variant="bodySmallBold" style={styles.sectionTitle}>
                {t('leads.form.leadDetailsSection')}
              </Typography>
            </View>
            <Dropdown
              label={t('leads.form.source')}
              placeholder={t('leads.form.source')}
              options={sourceOptions}
              value={form.source}
              onChange={(v) => updateForm('source', v)}
              required
              error={errors.source}
            />
            <TrafficLightSelector
              label={t('leads.form.leadPriority')}
              value={form.priority}
              onChange={(v) => updateForm('priority', v)}
              required
            />
            {errors.priority && (
              <Typography variant="caption" style={{ color: theme.error, marginTop: -8, marginBottom: 8 }}>
                {errors.priority}
              </Typography>
            )}
          </View>

          {/* Follow-up Details */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.dot} />
              <Typography variant="bodySmallBold" style={styles.sectionTitle}>
                {t('leads.form.scheduleFollowUp')}
              </Typography>
            </View>
            <Dropdown
              label={t('leads.form.followUpType')}
              placeholder={t('leads.form.followUpType')}
              options={followUpTypeOptions}
              value={form.followUpType}
              onChange={(v) => updateForm('followUpType', v)}
              required
              error={errors.followUpType}
            />
            <TrafficLightSelector
              label={t('leads.form.followUpPriority')}
              value={form.followUpPriority}
              onChange={(v) => updateForm('followUpPriority', v)}
              required
            />
            {errors.followUpPriority && (
              <Typography variant="caption" style={{ color: theme.error, marginTop: -8, marginBottom: 8 }}>
                {errors.followUpPriority}
              </Typography>
            )}
            <Input
              label={t('leads.form.followUpSubject')}
              placeholder={t('leads.form.followUpSubjectPlaceholder')}
              value={form.followUpSubject}
              onChangeText={(val) => updateForm('followUpSubject', val)}
            />
            <View style={styles.row}>
              <DatePicker
                label={t('leads.form.dueDate')}
                value={form.followUpDueDate}
                onChange={(d) => updateForm('followUpDueDate', d)}
                required
                error={errors.followUpDueDate}
                style={styles.flex1}
              />
              <TimePicker
                label={t('leads.form.time')}
                value={form.followUpScheduledTime}
                onChange={(val) => updateForm('followUpScheduledTime', val)}
                required
                error={errors.followUpScheduledTime}
              />
            </View>
            <Dropdown
              label={t('leads.form.estimatedDuration')}
              placeholder={t('leads.form.selectDuration')}
              options={durationOptions}
              value={form.followUpEstimatedDuration}
              onChange={(v) => updateForm('followUpEstimatedDuration', v)}
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.dot} />
              <Typography variant="bodySmallBold" style={styles.sectionTitle}>
                {t('leads.form.notesSection')}
              </Typography>
            </View>
            <Input
              label={t('leads.form.additionalNotes')}
              placeholder={t('leads.form.additionalNotesPlaceholder')}
              value={form.notes}
              onChangeText={(val) => updateForm('notes', val)}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, alignItems: 'flex-start' }}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={styles.cancelBtn}
            onPress={handleBack}
            disabled={isAdding || isExiting}
          >
            <Text style={styles.cancelBtnText}>{t('leads.form.cancel')}</Text>
          </Pressable>
          <Pressable
            style={styles.submitBtnWrapper}
            onPress={handleSubmit}
            disabled={isAdding}
          >
            <LinearGradient
              colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {isAdding ? (
                <Text style={styles.submitBtnText}>{t('leads.form.saving')}</Text>
              ) : (
                <>
                  <Feather name="check" size={20} color="#FFF" style={styles.submitIcon} />
                  <Text style={styles.submitBtnText}>{t('leads.form.saveLead')}</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </SlideIn>
  );
}

const styles = StyleSheet.create({
  slideIn: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  header: {
    backgroundColor: BrandColors.tealDark,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 19,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },
  formBody: {
    flex: 1,
  },
  formContent: {
    padding: 18,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 14,
    shadowColor: BrandColors.tealDark,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e3ece9',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.memberGold,
  },
  sectionTitle: {
    color: BrandColors.tealDark,
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  footer: {
    flexDirection: 'row',
    padding: 18,
    paddingBottom: 24,
    gap: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#e3ece9',
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e3ece9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  cancelBtnText: {
    color: BrandColors.tealDark,
    fontWeight: '700',
    fontSize: 14.5,
  },
  submitBtnWrapper: {
    flex: 1,
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitIcon: {
    marginRight: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14.5,
  },
});
