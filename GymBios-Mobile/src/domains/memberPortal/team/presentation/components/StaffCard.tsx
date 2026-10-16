import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text } from '@/shared/components/AppText';
import { GlassSurface } from '@/shared/components';
import { Avatar } from '@/shared/components/Avatar';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { initialsOf, type TeamMember } from '../../domain/TeamMember';
import { StarRow } from './StarRow';

interface StaffCardProps {
  member: TeamMember;
  onOpen: () => void;
  onRate: () => void;
}

export function StaffCard({ member, onOpen, onRate }: StaffCardProps) {
  const { t } = useTranslation();

  return (
    // The open area and the action buttons are siblings, not nested: on web a Pressable
    // renders a <button>, and a <button> can't contain another.
    <GlassSurface radius={Radius.xl} style={styles.card}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t('team.openA11y', { name: member.name })}
      >
        <Avatar
          size={52}
          initials={initialsOf(member.name)}
          imageUrl={member.photoUrl ?? undefined}
          backgroundColor={avatarColor(member.id)}
        />

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{member.name}</Text>
          <Text style={styles.role} numberOfLines={1}>
            {[member.role, member.department].filter(Boolean).join(' · ')}
          </Text>
          {member.averageRating != null ? (
            <View style={styles.ratingRow}>
              <StarRow value={member.averageRating} size={13} />
              <Text style={styles.ratingValue}>{member.averageRating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>· {t('team.ratingCount', { count: member.ratingCount })}</Text>
            </View>
          ) : (
            <Text style={styles.ratingCount}>{t('team.notRated')}</Text>
          )}
          {member.certifications.length > 0 && (
            <View style={styles.tags}>
              {member.certifications.slice(0, 2).map(c => (
                <View key={c} style={styles.tag}>
                  <Text style={styles.tagText} numberOfLines={1}>{c}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          onPress={onRate}
          hitSlop={4}
          style={({ pressed }) => [styles.iconButton, styles.rateButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('team.rateA11y', { name: member.name })}
        >
          <MaterialCommunityIcons name={member.myRating ? 'star' : 'star-outline'} size={20} color="#8A5A00" />
        </Pressable>
        {/* Messaging isn't built yet — the button holds its place. */}
        <View
          style={[styles.iconButton, styles.messageButton, styles.disabled]}
          accessible
          accessibilityState={{ disabled: true }}
          accessibilityLabel={`${t('team.messageA11y', { name: member.name })}, ${t('team.profile.messageSoon')}`}
        >
          <Feather name="message-circle" size={19} color="#FFFFFF" />
        </View>
      </View>
    </GlassSurface>
  );
}

const AVATAR_COLORS = ['#F5B73C', '#7C5CF5', BrandColors.teal, '#E07B53', '#4C7BD9'];

/** Stable per-person colour for the initials avatar. */
export function avatarColor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: 14,
  },
  open: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  role: {
    fontSize: TypographyScale.small,
    fontWeight: '600',
    color: BrandColors.textSecondary,
    marginTop: 1,
    marginBottom: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  ratingCount: {
    fontSize: TypographyScale.small,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(30,41,59,0.06)',
    maxWidth: 160,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.textSecondary,
  },
  actions: {
    gap: Spacing.two,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateButton: {
    backgroundColor: '#FDF0CF',
  },
  messageButton: {
    backgroundColor: BrandColors.teal,
  },
  disabled: {
    opacity: 0.4,
  },
});
