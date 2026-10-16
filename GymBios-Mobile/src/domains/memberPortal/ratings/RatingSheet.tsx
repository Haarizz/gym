import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, TextInput } from '@/shared/components/AppText';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet/AppBottomSheet';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export const REVIEW_MAX_LENGTH = 300;
export const STAR_ON = '#F2A60C';
export const STAR_OFF = '#E3DCCB';

export interface RatingValues<T extends string> {
  rating: number;
  tags: T[];
  comment: string;
  anonymous: boolean;
}

interface RatingSheetProps<T extends string> {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** "What stood out" keys on offer, and how to show each. */
  tagOptions: readonly T[];
  tagLabel: (tag: T) => string;
  /** The member's earlier rating, to start from. */
  initial: RatingValues<T> | null;
  /** Changes whenever the form should restart from `initial` (another subject, or the earlier rating loaded). */
  formKey: string | null;
  submitting: boolean;
  onSubmit: (values: RatingValues<T>) => void;
  onClose: () => void;
}

/**
 * The rate sheet shared by staff and gym ratings: 1-5 stars, "what stood out" tags,
 * an optional review and anonymous posting.
 */
export function RatingSheet<T extends string>({
  visible, title, subtitle, tagOptions, tagLabel, initial, formKey, submitting, onSubmit, onClose,
}: RatingSheetProps<T>) {
  const { t } = useTranslation();

  const [score, setScore] = useState(0);
  const [tags, setTags] = useState<T[]>([]);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  if (formKey !== loadedKey) {
    setLoadedKey(formKey);
    setScore(initial?.rating ?? 0);
    setTags(initial?.tags ?? []);
    setComment(initial?.comment ?? '');
    setAnonymous(initial?.anonymous ?? false);
  }

  const toggleTag = (tag: T) =>
    setTags(current => (current.includes(tag) ? current.filter(x => x !== tag) : [...current, tag]));

  const submit = () => {
    if (!score) return;
    onSubmit({ rating: score, tags, comment: comment.trim(), anonymous });
  };

  return (
    <AppBottomSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <Pressable
          style={({ pressed }) => [styles.submit, (!score || submitting) && styles.submitDisabled, pressed && styles.pressed]}
          disabled={!score || submitting}
          onPress={submit}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>{initial ? t('team.rate.update') : t('team.rate.submit')}</Text>
          )}
        </Pressable>
      }
    >
      {visible && (
        <View>
          <View style={styles.pick} accessibilityRole="radiogroup">
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable
                key={n}
                onPress={() => setScore(n)}
                style={({ pressed }) => [styles.starButton, pressed && styles.starPressed]}
                accessibilityRole="radio"
                accessibilityState={{ checked: n === score }}
                accessibilityLabel={t('team.rate.starA11y', { count: n })}
              >
                <MaterialCommunityIcons name="star" size={38} color={n <= score ? STAR_ON : STAR_OFF} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.pickLabel}>
            {score ? t(`team.rate.labels.${score}` as any) : t('team.rate.tapToRate')}
          </Text>

          <Text style={styles.label}>{t('team.rate.whatStoodOut')}</Text>
          <View style={styles.tags}>
            {tagOptions.map(tag => {
              const on = tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[styles.tag, on && styles.tagOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.tagText, on && styles.tagTextOn]}>{tagLabel(tag)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>
            {t('team.rate.writeReview')} <Text style={styles.optional}>{t('team.rate.optional')}</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            maxLength={REVIEW_MAX_LENGTH}
            multiline
            textAlignVertical="top"
            placeholder={t('team.rate.reviewPlaceholder')}
            placeholderTextColor="#8A8170"
            accessibilityLabel={t('team.rate.writeReview')}
          />
          <Text style={styles.count}>{comment.length}/{REVIEW_MAX_LENGTH}</Text>

          <View style={styles.anonRow}>
            <View style={styles.anonText}>
              <Text style={styles.anonTitle}>{t('team.rate.anonymous')}</Text>
              <Text style={styles.anonHint}>{t('team.rate.anonymousHint')}</Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={setAnonymous}
              trackColor={{ true: BrandColors.teal }}
              accessibilityLabel={t('team.rate.anonymous')}
            />
          </View>
        </View>
      )}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  pick: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.two,
  },
  starButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starPressed: {
    backgroundColor: 'rgba(246,183,60,0.12)',
  },
  pickLabel: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 15,
    minHeight: 22,
    color: '#8A5A00',
    marginTop: Spacing.one,
  },
  label: {
    fontSize: TypographyScale.small,
    fontWeight: '800',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: Spacing.two,
  },
  optional: {
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '600',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.1)',
    backgroundColor: '#FFFFFF',
  },
  tagOn: {
    backgroundColor: '#FDF0CF',
    borderColor: '#F6B73C',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  tagTextOn: {
    color: '#6B4700',
  },
  input: {
    minHeight: 96,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.1)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: Spacing.md,
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
  },
  count: {
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
    marginTop: Spacing.one,
  },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.three,
  },
  anonText: {
    flex: 1,
  },
  anonTitle: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  anonHint: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  submit: {
    height: 52,
    borderRadius: 18,
    backgroundColor: BrandColors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
});
