import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, Text } from 'react-native';
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

const sourceOptions = [
  { label: 'Website', value: 'website' },
  { label: 'Referral', value: 'referral' },
  { label: 'Walk-in', value: 'walk-in' },
  { label: 'Social Media', value: 'social-media' },
  { label: 'Google Ads', value: 'google-ads' },
  { label: 'Facebook Ads', value: 'facebook-ads' },
];

const followUpTypeOptions = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'In-App Message', value: 'in_app' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Visit', value: 'visit' },
];

const durationOptions = [
  { label: '15 minutes', value: '15' },
  { label: '30 minutes', value: '30' },
  { label: '45 minutes', value: '45' },
  { label: '1 hour', value: '60' },
];

export function AddLeadScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { addLead, isAdding } = useAddLead();
  const [isExiting, setIsExiting] = useState(false);

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
    if (!form.firstName.trim()) newErrors.firstName = 'Required';
    if (!form.lastName.trim()) newErrors.lastName = 'Required';
    if (!form.phone.trim()) newErrors.phone = 'Required';
    if (!form.source) newErrors.source = 'Required';
    if (!form.priority) newErrors.priority = 'Required';
    if (!form.followUpType) newErrors.followUpType = 'Required';
    if (!form.followUpDueDate) newErrors.followUpDueDate = 'Required';
    if (!form.followUpScheduledTime) newErrors.followUpScheduledTime = 'Required';
    if (!form.followUpPriority) newErrors.followUpPriority = 'Required';
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
        followUpSubject: form.followUpSubject || 'Follow-up',
        followUpDueDate: form.followUpDueDate!.toISOString().split('T')[0] + 'T00:00:00',
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
              Add New Lead
            </Typography>
            <Typography variant="bodySmall" style={styles.headerSubtitle}>
              Fill in the details below
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
                CONTACT DETAILS
              </Typography>
            </View>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Input
                  label="First name"
                  placeholder="e.g. Jana"
                  value={form.firstName}
                  onChangeText={(t) => updateForm('firstName', t)}
                  error={errors.firstName}
                />
              </View>
              <View style={styles.flex1}>
                <Input
                  label="Last name"
                  placeholder="e.g. Doe"
                  value={form.lastName}
                  onChangeText={(t) => updateForm('lastName', t)}
                  error={errors.lastName}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Input
                  label="Email"
                  placeholder="jana@email.com"
                  value={form.email}
                  onChangeText={(t) => updateForm('email', t)}
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.flex1}>
                <Input
                  label="Phone"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChangeText={(t) => updateForm('phone', t)}
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
                LEAD DETAILS
              </Typography>
            </View>
            <Dropdown
              label="Lead source"
              placeholder="Select source"
              options={sourceOptions}
              value={form.source}
              onChange={(v) => updateForm('source', v)}
              required
              error={errors.source}
            />
            <TrafficLightSelector
              label="Lead Priority"
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
                SCHEDULE FOLLOW-UP
              </Typography>
            </View>
            <Dropdown
              label="Follow-up type"
              placeholder="Select type"
              options={followUpTypeOptions}
              value={form.followUpType}
              onChange={(v) => updateForm('followUpType', v)}
              required
              error={errors.followUpType}
            />
            <TrafficLightSelector
              label="Follow-up Priority"
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
              label="Follow-up subject"
              placeholder="e.g. Membership plan"
              value={form.followUpSubject}
              onChangeText={(t) => updateForm('followUpSubject', t)}
            />
            <View style={styles.row}>
              <DatePicker
                label="Due date"
                value={form.followUpDueDate}
                onChange={(d) => updateForm('followUpDueDate', d)}
                required
                error={errors.followUpDueDate}
                style={styles.flex1}
              />
              <TimePicker
                label="Time"
                value={form.followUpScheduledTime}
                onChange={(t) => updateForm('followUpScheduledTime', t)}
                required
                error={errors.followUpScheduledTime}
              />
            </View>
            <Dropdown
              label="Estimated duration"
              placeholder="Select duration"
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
                NOTES
              </Typography>
            </View>
            <Input
              label="Additional notes"
              placeholder="Anything the team should know..."
              value={form.notes}
              onChangeText={(t) => updateForm('notes', t)}
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
            <Text style={styles.cancelBtnText}>Cancel</Text>
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
                <Text style={styles.submitBtnText}>Saving...</Text>
              ) : (
                <>
                  <Feather name="check" size={20} color="#FFF" style={styles.submitIcon} />
                  <Text style={styles.submitBtnText}>Save Lead</Text>
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
