import React from 'react';
import { View, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Avatar } from '@/shared/components/Avatar';
import { useCurrency, CurrencyGlyph } from '@/core/providers/CurrencyProvider';

export interface MemberReferralData {
  id: string;
  memberName: string;
  memberEmail: string;
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewardsEarned: number;
  rewardBalance: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  avatar?: string;
}

interface ReferralMemberCardProps {
  member: MemberReferralData;
  onCopyCode: (code: string) => void;
  onCopyLink: (link: string) => void;
  onGenerateQr: (link: string) => void;
}

export function ReferralMemberCard({
  member,
  onCopyCode,
  onCopyLink,
  onGenerateQr,
}: ReferralMemberCardProps) {
  const { currencyCode } = useCurrency();

  const getTierStyle = (tier: string) => {
    switch (tier) {
      case 'Platinum':
        return { bg: '#f3e8ff', text: '#7e22ce', icon: 'award' as const };
      case 'Gold':
        return { bg: '#fef3c7', text: '#b45309', icon: 'sun' as const };
      case 'Silver':
        return { bg: '#f1f5f9', text: '#475569', icon: 'star' as const };
      case 'Bronze':
      default:
        return { bg: '#ffedd5', text: '#c2410c', icon: 'target' as const };
    }
  };

  const handleWhatsAppShare = () => {
    const msg = `Join our gym with my referral code: ${member.referralCode}! Get exclusive benefits!`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Sharing', `WhatsApp message prepared:\n${msg}`);
      }
    });
  };

  const handleEmailShare = () => {
    const subject = 'Join Our Gym - Exclusive Invitation!';
    const body = `Hi!\n\nJoin our gym using my referral code "${member.referralCode}" or link: https://${member.referralLink}\n\nBest regards,\n${member.memberName}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Sharing', `Email invitation:\n${body}`);
    });
  };

  const tierStyle = getTierStyle(member.tier);

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Avatar name={member.memberName} size="lg" style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Typography variant="subtitle" style={styles.memberName}>
            {member.memberName}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {member.memberEmail || '—'}
          </Typography>
        </View>
        <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
          <Feather name={tierStyle.icon} size={11} color={tierStyle.text} />
          <Typography variant="caption" style={[styles.tierText, { color: tierStyle.text }]}>
            {member.tier}
          </Typography>
        </View>
      </View>

      {/* Code & Link Section */}
      <View style={styles.inputGroup}>
        <Typography variant="caption" color="textSecondary" style={styles.inputLabel}>
          Referral Code
        </Typography>
        <View style={styles.inputRow}>
          <Typography variant="bodySmall" style={styles.codeText} numberOfLines={1}>
            {member.referralCode || '—'}
          </Typography>
          <Pressable style={styles.copyBtn} onPress={() => onCopyCode(member.referralCode)}>
            <Feather name="copy" size={14} color={BrandColors.teal} />
          </Pressable>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Typography variant="caption" color="textSecondary" style={styles.inputLabel}>
          Referral Link
        </Typography>
        <View style={styles.inputRow}>
          <Typography variant="caption" style={styles.linkText} numberOfLines={1}>
            {member.referralLink || '—'}
          </Typography>
          <Pressable style={styles.copyBtn} onPress={() => onCopyLink(member.referralLink)}>
            <Feather name="copy" size={14} color={BrandColors.teal} />
          </Pressable>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: '#dcfce7' }]}>
          <Typography variant="caption" style={{ color: '#166534', fontSize: 10 }}>
            Successful
          </Typography>
          <Typography variant="subtitle" style={{ color: '#15803d', fontWeight: '700' }}>
            {member.successfulReferrals}
          </Typography>
        </View>

        <View style={[styles.statBox, { backgroundColor: '#fef9c3' }]}>
          <Typography variant="caption" style={{ color: '#854d0e', fontSize: 10 }}>
            Pending
          </Typography>
          <Typography variant="subtitle" style={{ color: '#a16207', fontWeight: '700' }}>
            {member.pendingReferrals}
          </Typography>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: '#f3e8ff' }]}>
          <Typography variant="caption" style={{ color: '#6b21a8', fontSize: 10 }}>
            Total Earned
          </Typography>
          <Typography variant="subtitle" style={{ color: '#7e22ce', fontWeight: '700', fontSize: 13 }}>
            <CurrencyGlyph code={currencyCode} /> {member.totalRewardsEarned.toLocaleString()}
          </Typography>
        </View>

        <View style={[styles.statBox, { backgroundColor: '#dbeafe' }]}>
          <Typography variant="caption" style={{ color: '#1e40af', fontSize: 10 }}>
            Balance
          </Typography>
          <Typography variant="subtitle" style={{ color: '#1d4ed8', fontWeight: '700', fontSize: 13 }}>
            <CurrencyGlyph code={currencyCode} /> {member.rewardBalance.toLocaleString()}
          </Typography>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Pressable style={styles.shareBtn} onPress={handleWhatsAppShare}>
          <Feather name="message-circle" size={14} color="#16a34a" />
          <Typography variant="caption" style={styles.shareBtnText}>
            WhatsApp
          </Typography>
        </Pressable>

        <Pressable style={styles.shareBtn} onPress={handleEmailShare}>
          <Feather name="mail" size={14} color="#2563eb" />
          <Typography variant="caption" style={styles.shareBtnText}>
            Email
          </Typography>
        </Pressable>

        <Pressable style={styles.qrBtn} onPress={() => onGenerateQr(member.referralLink)}>
          <Feather name="code" size={16} color={BrandColors.teal} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  avatar: {
    marginRight: Spacing.three,
  },
  headerInfo: {
    flex: 1,
    marginRight: Spacing.two,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 4,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: Spacing.two,
  },
  inputLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  codeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  linkText: {
    flex: 1,
    fontSize: 11,
    color: BrandColors.textSecondary,
  },
  copyBtn: {
    padding: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  statBox: {
    flex: 1,
    padding: Spacing.two,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.md,
    gap: 6,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  qrBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: '#eef7f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
