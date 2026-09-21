import { StyleSheet, Switch, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { GlassSurface } from '@/shared/components';
import type { LinkedAccount } from '../../domain';

const HAIRLINE = 'rgba(30,42,58,0.07)';

interface SettingSwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  /** Top hairline separating this row from the one above it — pass false on the first row in a card. */
  divider?: boolean;
}

export function SettingSwitchRow({
  label,
  description,
  value,
  onValueChange,
  divider = true,
}: SettingSwitchRowProps) {
  return (
    <View style={[styles.switchRow, divider && styles.divider]}>
      <View style={styles.switchTextWrapper}>
        <Typography variant="body" style={styles.switchLabel}>
          {label}
        </Typography>
        {description && (
          <Typography variant="caption" color="textSecondary" style={styles.switchDescription}>
            {description}
          </Typography>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e2e8f0', true: BrandColors.teal }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

interface LinkedAccountRowProps {
  account: LinkedAccount;
  /** Top hairline separating this row from the one above it — pass false on the first row in a card. */
  divider?: boolean;
}

export function LinkedAccountRow({ account, divider = true }: LinkedAccountRowProps) {
  const iconName =
    account.type === 'email'
      ? 'mail'
      : account.type === 'device'
        ? 'smartphone'
        : 'credit-card';

  return (
    <View style={[styles.accountRow, divider && styles.divider]}>
      <View style={styles.accountIconBox}>
        <Feather name={iconName} size={18} color={BrandColors.teal} />
      </View>
      <View style={styles.accountDetails}>
        <Typography variant="body" style={styles.accountName}>
          {account.name}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {account.detail}
        </Typography>
      </View>
      <View style={styles.connectedBadge}>
        <Typography variant="caption" style={styles.connectedText}>
          Connected
        </Typography>
      </View>
    </View>
  );
}

interface SettingsCardProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}

export function SettingsCard({ title, icon, children }: SettingsCardProps) {
  return (
    <GlassSurface radius={Radius.lg} style={styles.card}>
      <View style={styles.cardHeader}>
        <Feather name={icon} size={18} color={BrandColors.teal} style={styles.cardHeaderIcon} />
        <Typography variant="subtitle" style={styles.cardTitle}>
          {title}
        </Typography>
      </View>
      <View>{children}</View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  cardHeaderIcon: {
    marginRight: Spacing.two,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  switchTextWrapper: {
    flex: 1,
    paddingRight: Spacing.three,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  switchDescription: {
    marginTop: 2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  accountIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef7f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  connectedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  connectedText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
});
