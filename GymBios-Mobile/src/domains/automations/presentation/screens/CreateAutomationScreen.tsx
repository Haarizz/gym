import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/shared/components/AppHeader';
import { Typography } from '@/shared/components/Typography';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/Dropdown';
import { useCreateAutomation } from '../../hooks/useAutomationActions';
import { CreateWorkflowPayload, AutomationFrequency } from '../../domain/types';
import { Spacing } from '@/core/theme';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';

export const CreateAutomationScreen = () => {
  const router = useRouter();
  const { mutate: createWorkflow, isPending } = useCreateAutomation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [actionType, setActionType] = useState('');
  const [frequency, setFrequency] = useState<AutomationFrequency>('once');
  const [cooldownHours, setCooldownHours] = useState('24');

  const handleSave = () => {
    if (!name || !triggerType || !actionType) {
      return;
    }

    const payload: CreateWorkflowPayload = {
      name,
      description,
      triggerType,
      triggerParams: '{}',
      actionType,
      delayMinutes: 0,
      frequency,
      cooldownHours: parseInt(cooldownHours, 10) || 24,
    };

    createWorkflow(payload, {
      onSuccess: () => {
        router.back();
      }
    });
  };

  const frequencyOptions = [
    { label: 'Once (single run, then stops)', value: 'once' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  const triggerOptions = [
    { label: 'Membership Expiry', value: 'membership_expiry' },
    { label: 'Member Birthday', value: 'birthday' },
    { label: 'Missed Workout', value: 'missed_workout' },
    { label: 'Low Attendance', value: 'low_attendance' },
    { label: 'New Member Signup', value: 'new_signup' },
    { label: 'Class Reminder', value: 'class_reminder' },
  ];

  const actionOptions = [
    { label: 'In-App Notification', value: 'send_in_app' },
    { label: 'Send Email', value: 'send_email' },
    { label: 'Send SMS', value: 'send_sms' },
    { label: 'Create Task', value: 'create_task' },
  ];

  return (
    <ScreenLayout>
      <AppHeader 
        title="Create Automation" 
        subtitle="Build a new workflow"
        colors={['#327f74', '#2a6b62']} 
        onBack={() => router.back()} 
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Typography variant="bodySmallBold" style={styles.sectionTitle}>
            Basic Information
          </Typography>
          <View style={styles.inputSpacing}>
            <Input
              label="Workflow Name"
              placeholder="e.g. Birthday Greeting"
              value={name}
              onChangeText={setName}
            />
          </View>
          <View style={styles.inputSpacing}>
            <Input
              label="Description"
              placeholder="Describe what this automation does"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </View>

        <View style={styles.section}>
          <Typography variant="bodySmallBold" style={styles.sectionTitle}>
            When should this trigger?
          </Typography>
          <Dropdown
            label="Trigger Type"
            options={triggerOptions}
            value={triggerType}
            onChange={(optionValue: string) => setTriggerType(optionValue)}
          />
        </View>

        <View style={styles.section}>
          <Typography variant="bodySmallBold" style={styles.sectionTitle}>
            What should happen?
          </Typography>
          <Dropdown
            label="Action Type"
            options={actionOptions}
            value={actionType}
            onChange={(optionValue: string) => setActionType(optionValue)}
          />
        </View>

        <View style={styles.section}>
          <Typography variant="bodySmallBold" style={styles.sectionTitle}>
            Schedule & Rules
          </Typography>
          <Dropdown
            label="Frequency"
            options={frequencyOptions}
            value={frequency}
            onChange={(optionValue: string) => setFrequency(optionValue as AutomationFrequency)}
          />
          <View style={styles.inputSpacing}>
            <Input
              label="Cooldown Period (Hours)"
              placeholder="24"
              keyboardType="number-pad"
              value={cooldownHours}
              onChangeText={setCooldownHours}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Save & Activate"
          onPress={handleSave}
          loading={isPending}
          disabled={!name || !triggerType || !actionType}
        />
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.four * 2,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  inputSpacing: {
    marginBottom: Spacing.md,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#ececf0',
  },
});

