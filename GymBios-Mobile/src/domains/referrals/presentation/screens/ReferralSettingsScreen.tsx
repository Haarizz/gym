import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Switch } from 'react-native';
import { TextInput } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { CurrencyGlyph } from '@/core/providers';
import { ReferralHeader } from '../components/ReferralHeader';
import { useReferralSettings } from '../../hooks/useReferrals';
import { useUpdateReferralSettings } from '../../hooks/useReferralActions';
import type { ReferralSettings } from '../../domain/ReferralSettings';

import { toast } from '@/shared/components/Toasts/toastStore';
import { useTranslation } from 'react-i18next';

export function ReferralSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: serverSettings, isLoading } = useReferralSettings();
  const updateSettingsMutation = useUpdateReferralSettings();

  const [settings, setSettings] = useState<ReferralSettings>({
    programEnabled: true,
    autoGenerateCodes: true,
    emailNotifications: true,
    autoProcessRewards: false,
    codePrefix: 'GYM',
    linkDomain: 'gymbios.app/ref',
    maxRewardsPerMember: 1000,
    expiryDays: 90,
    minPurchaseAmount: 100,
  });

  useEffect(() => {
    if (serverSettings) {
      setSettings(serverSettings);
    }
  }, [serverSettings]);

  const handleSave = () => {
    updateSettingsMutation.mutate(settings, {
      onSuccess: () => {
        toast.success('Program settings saved successfully.', {
          title: 'Success'
        });
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to save settings.', {
          title: 'Error'
        });
      },
    });
  };

  return (
    <View style={styles.screen}>
      <ReferralHeader
        title={t('adminReferrals.settingsTitle')}
        subtitle={t('adminReferrals.settingsSubtitle')}
        onBack={() => router.back()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.body}>
          {/* General Settings */}
          <View style={styles.card}>
            <Typography variant="subtitle" style={styles.cardTitle}>
              {t('adminReferrals.generalSettings')}
            </Typography>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.two }}>
                <Typography variant="bodySmall" style={styles.switchLabel}>
                  {t('adminReferrals.enableProgram')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {t('adminReferrals.enableProgramDesc')}
                </Typography>
              </View>
              <Switch
                value={settings.programEnabled}
                onValueChange={(val) => setSettings((p) => ({ ...p, programEnabled: val }))}
                trackColor={{ false: '#cbd5e1', true: BrandColors.teal }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.two }}>
                <Typography variant="bodySmall" style={styles.switchLabel}>
                  {t('adminReferrals.autoGenerateCodes')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {t('adminReferrals.autoGenerateCodesDesc')}
                </Typography>
              </View>
              <Switch
                value={settings.autoGenerateCodes}
                onValueChange={(val) => setSettings((p) => ({ ...p, autoGenerateCodes: val }))}
                trackColor={{ false: '#cbd5e1', true: BrandColors.teal }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.two }}>
                <Typography variant="bodySmall" style={styles.switchLabel}>
                  {t('adminReferrals.emailNotifications')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {t('adminReferrals.emailNotificationsDesc')}
                </Typography>
              </View>
              <Switch
                value={settings.emailNotifications}
                onValueChange={(val) => setSettings((p) => ({ ...p, emailNotifications: val }))}
                trackColor={{ false: '#cbd5e1', true: BrandColors.teal }}
              />
            </View>

            <Typography variant="bodySmall" style={styles.inputLabel}>
              {t('adminReferrals.codePrefix')}
            </Typography>
            <TextInput
              style={styles.input}
              value={settings.codePrefix}
              onChangeText={(val) => setSettings((p) => ({ ...p, codePrefix: val }))}
            />

            <Typography variant="bodySmall" style={styles.inputLabel}>
              {t('adminReferrals.linkDomain')}
            </Typography>
            <TextInput
              style={styles.input}
              value={settings.linkDomain}
              onChangeText={(val) => setSettings((p) => ({ ...p, linkDomain: val }))}
            />
          </View>

          {/* Reward Settings */}
          <View style={styles.card}>
            <Typography variant="subtitle" style={styles.cardTitle}>
              {t('adminReferrals.rewardSettings')}
            </Typography>

            <Typography variant="bodySmall" style={styles.inputLabel}>
              {t('adminReferrals.maxRewardsPerMember')}
            </Typography>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={settings.maxRewardsPerMember ? String(settings.maxRewardsPerMember) : ''}
              onChangeText={(val) =>
                setSettings((p) => ({
                  ...p,
                  maxRewardsPerMember: val ? Number(val) : null,
                }))
              }
            />
            <Typography variant="caption" color="textSecondary" style={styles.helpText}>
              {t('adminReferrals.limitIn')} <CurrencyGlyph />
            </Typography>

            <Typography variant="bodySmall" style={styles.inputLabel}>
              {t('adminReferrals.defaultRewardExpiry')}
            </Typography>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={settings.expiryDays ? String(settings.expiryDays) : ''}
              onChangeText={(val) =>
                setSettings((p) => ({
                  ...p,
                  expiryDays: val ? Number(val) : 90,
                }))
              }
            />

            <Typography variant="bodySmall" style={styles.inputLabel}>
              {t('adminReferrals.minPurchaseAmount')}
            </Typography>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={settings.minPurchaseAmount ? String(settings.minPurchaseAmount) : ''}
              onChangeText={(val) =>
                setSettings((p) => ({
                  ...p,
                  minPurchaseAmount: val ? Number(val) : null,
                }))
              }
            />
            <Typography variant="caption" color="textSecondary" style={styles.helpText}>
              {t('adminReferrals.minAmountTrigger')}
            </Typography>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: Spacing.two }}>
                <Typography variant="bodySmall" style={styles.switchLabel}>
                  {t('adminReferrals.autoProcessRewards')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {t('adminReferrals.autoProcessRewardsDesc')}
                </Typography>
              </View>
              <Switch
                value={settings.autoProcessRewards}
                onValueChange={(val) => setSettings((p) => ({ ...p, autoProcessRewards: val }))}
                trackColor={{ false: '#cbd5e1', true: BrandColors.teal }}
              />
            </View>
          </View>

          {/* Tier System Information */}
          <View style={styles.card}>
            <Typography variant="subtitle" style={styles.cardTitle}>
              {t('adminReferrals.tierSystem')}
            </Typography>

            <View style={styles.tierGrid}>
              <View style={[styles.tierBox, { backgroundColor: '#ffedd5', borderColor: '#fed7aa' }]}>
                <Feather name="target" size={24} color="#c2410c" />
                <Typography variant="bodySmall" style={{ fontWeight: '700', color: '#c2410c', marginTop: 4 }}>
                  {t('adminReferrals.bronze')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {t('adminReferrals.bronzeDesc')}
                </Typography>
              </View>

              <View style={[styles.tierBox, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                <Feather name="star" size={24} color="#475569" />
                <Typography variant="bodySmall" style={{ fontWeight: '700', color: '#475569', marginTop: 4 }}>
                  {t('adminReferrals.silver')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {t('adminReferrals.silverDesc')}
                </Typography>
              </View>
            </View>

            <View style={styles.tierGrid}>
              <View style={[styles.tierBox, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                <Feather name="sun" size={24} color="#b45309" />
                <Typography variant="bodySmall" style={{ fontWeight: '700', color: '#b45309', marginTop: 4 }}>
                  {t('adminReferrals.gold')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {t('adminReferrals.goldDesc')}
                </Typography>
              </View>

              <View style={[styles.tierBox, { backgroundColor: '#f3e8ff', borderColor: '#e9d5ff' }]}>
                <Feather name="award" size={24} color="#7e22ce" />
                <Typography variant="bodySmall" style={{ fontWeight: '700', color: '#7e22ce', marginTop: 4 }}>
                  {t('adminReferrals.platinum')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {t('adminReferrals.platinumDesc')}
                </Typography>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <Button
            title={t('adminReferrals.saveSettings')}
            onPress={handleSave}
            loading={updateSettingsMutation.isPending}
            style={styles.saveBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  body: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  switchLabel: {
    fontWeight: '600',
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: Spacing.two,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  helpText: {
    fontSize: 11,
    marginTop: 2,
  },
  tierGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  tierBox: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  saveBtn: {
    marginTop: Spacing.two,
  },
});
