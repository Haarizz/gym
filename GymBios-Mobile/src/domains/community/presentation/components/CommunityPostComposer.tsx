import { useTranslation } from 'react-i18next';
import { tOr } from '@/core/i18n';
import { useCallback } from 'react';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { TextInput } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Button, Typography } from '@/shared/components';
import { useCreateCommunityPost } from '../../hooks/useCommunityActions';
import { useCommunityMode } from '../../hooks/useCommunity';
import type { CropRatio } from '../hooks/useCommunityPostComposer';

import { toast } from '@/shared/components/Toasts/toastStore';


const POST_TYPES = [
  { value: 'achievement', label: '🏆 Achievement' },
  { value: 'question', label: '❓ Question' },
  { value: 'tip', label: '💡 Tip' },
] as const;

const CROP_RATIOS: { value: CropRatio; label: string; sub: 'square' | 'portrait' | 'story' }[] = [
  { value: '1:1', label: '1:1', sub: 'square' },
  { value: '4:5', label: '4:5', sub: 'portrait' },
  { value: '9:16', label: '9:16', sub: 'story' },
];

function getAspectRatioNumeric(ratio: CropRatio): number {
  const parts = ratio.split(':');
  return parseFloat(parts[0]) / parseFloat(parts[1]);
}

interface ComposerImage {
  dataUrl: string;
  uri: string;
}

interface CommunityPostComposerProps {
  topic: string;
  setTopic: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  image: ComposerImage | null;
  setImage: (v: ComposerImage | null) => void;
  cropRatio: CropRatio;
  setCropRatio: (v: CropRatio) => void;
  cropPosition: number;
  setCropPosition: (v: number) => void;
  cropZoom: number;
  setCropZoom: (v: number) => void;
  onSuccess: () => void;
}

export function CommunityPostComposer({
  topic,
  setTopic,
  type,
  setType,
  content,
  setContent,
  image,
  setImage,
  cropRatio,
  setCropRatio,
  cropPosition,
  setCropPosition,
  cropZoom,
  setCropZoom,
  onSuccess,
}: CommunityPostComposerProps) {
  const { t } = useTranslation();
  const { primaryColor, headerColors } = useCommunityTheme();
  const theme = useTheme();
  const createPost = useCreateCommunityPost();
  const { mode, config } = useCommunityMode();
  const isGlobal = mode === 'global' && config != null;
  const postingBlocked = isGlobal && !config.canPost;
  const blockedMessage = config?.readOnly
    ? t('community.composer.readOnly')
    : // Why a member can't post at their selected gym (codes from the server).
      tOr(`community.composer.blocked.${config?.postingBlockedReason ?? ''}`, t('community.composer.unavailable'));

  const handlePickImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.warning(t('community.composer.galleryPermission'), {
          title: t('community.composer.permissionTitle'),
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset.base64) {
          toast.error(t('community.composer.readImageFailed'), {
            title: t('community.composer.errorTitle'),
          });
          return;
        }
        const mimeType = asset.mimeType ?? 'image/jpeg';
        // The global Community enforces upload limits server-side; check first so
        // the member gets a clear message instead of a failed post.
        if (isGlobal) {
          const limits = config.limits;
          const bytes = asset.fileSize ?? Math.floor((asset.base64.length * 3) / 4);
          if (limits.imageTypes.length > 0 && !limits.imageTypes.includes(mimeType)) {
            toast.warning(t('community.composer.unsupportedImage'), { title: t('community.composer.unsupportedTitle') });
            return;
          }
          if (bytes > limits.imageBytes) {
            toast.warning(t('community.composer.tooLargeBytes', { size: (limits.imageBytes / (1024 * 1024)).toFixed(1) }), {
              title: t('community.composer.tooLargeTitle'),
            });
            return;
          }
          if (asset.width > limits.imageDimension || asset.height > limits.imageDimension) {
            toast.warning(t('community.composer.tooLargeDimension', { size: limits.imageDimension }), {
              title: t('community.composer.tooLargeTitle'),
            });
            return;
          }
        }
        const dataUrl = `data:${mimeType};base64,${asset.base64}`;
        setImage({ dataUrl, uri: asset.uri });
        setCropPosition(50);
        setCropZoom(100);
      }
    } catch {
      toast.error(t('community.composer.galleryFailed'), {
        title: t('community.composer.errorTitle'),
      });
    }
  }, [setImage, setCropPosition, setCropZoom, isGlobal, config]);

  const handleRemoveImage = useCallback(() => {
    setImage(null);
  }, [setImage]);

  const handleSubmit = useCallback(() => {
    if (!topic.trim()) {
      toast.info(t('community.composer.topicRequired'), {
        title: t('community.composer.validationTitle'),
      });
      return;
    }
    if (!content.trim()) {
      toast.info(t('community.composer.contentRequired'), {
        title: t('community.composer.validationTitle'),
      });
      return;
    }

    createPost.mutate(
      {
        topic: topic.trim(),
        content: content.trim(),
        type,
        ...(image && {
          imageDataUrl: image.dataUrl,
          imageAspectRatio: cropRatio,
          imageCropPosition: cropPosition,
          imageCropZoom: cropZoom,
        }),
      },
      {
        onSuccess,
        onError: (err) => {
          toast.error((err as Error)?.message ?? t('community.composer.createFailed'), {
            title: t('community.composer.errorTitle'),
          });
        },
      },
    );
  }, [topic, content, type, image, cropRatio, cropPosition, cropZoom, createPost, onSuccess]);

  const isSubmitting = createPost.isPending;
  const canSubmit = topic.trim().length > 0 && content.trim().length > 0 && !isSubmitting && !postingBlocked;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.kav}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Post Type */}
        <View style={styles.section}>
          <Typography variant="bodySmallBold" style={styles.label}>
            {t('community.composer.postType')}
          </Typography>
          <View style={styles.typeRow}>
            {POST_TYPES.map((pt) => {
              const isActive = type === pt.value;
              const typeClass = pt.value === 'achievement' ? { bg: '#FCF0D9', fg: '#C7861A', ic: '🏆' } :
                                pt.value === 'question' ? { bg: '#FCE7ED', fg: '#C93B5C', ic: '❓' } :
                                { bg: '#E4F5EC', fg: '#2E9463', ic: '💡' };
              
              return (
                <Pressable
                  key={pt.value}
                  style={({ pressed }) => [
                    styles.typeBtn,
                    {
                      backgroundColor: isActive ? typeClass.bg : theme.backgroundElement,
                      borderColor: isActive ? typeClass.fg : theme.border,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => setType(pt.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                >
                  <Typography style={{ fontSize: 18 }}>{typeClass.ic}</Typography>
                  <Typography
                    variant="caption"
                    style={[styles.typeBtnLabel, { color: isActive ? typeClass.fg : theme.textSecondary }]}
                  >
                    {t(`community.typeNames.${pt.value}`)}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Topic */}
        <View style={styles.section}>
          <Typography variant="bodySmallBold" style={styles.label}>
            {t('community.composer.topic')}
          </Typography>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.muted, color: theme.text, borderColor: theme.border },
            ]}
            placeholder={t('community.composer.topicPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            value={topic}
            onChangeText={setTopic}
            maxLength={120}
            returnKeyType="next"
          />
        </View>

        {/* Content */}
        <View style={styles.section}>
          <Typography variant="bodySmallBold" style={styles.label}>
            {t('community.composer.content')}
          </Typography>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: theme.muted, color: theme.text, borderColor: theme.border },
            ]}
            placeholder={t('community.composer.contentPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            value={content}
            onChangeText={setContent}
            maxLength={1000}
            multiline
            textAlignVertical="top"
          />
          <Typography variant="caption" color="textSecondary" style={styles.charCount}>
            {content.length}/1000
          </Typography>
        </View>

        {/* Photo */}
        <View style={styles.section}>
          <Typography variant="bodySmallBold" style={styles.label}>
            {t('community.composer.photo')}
          </Typography>

          {!image ? (
            <Pressable
              style={({ pressed }) => [
                styles.photoPlaceholder,
                { borderColor: '#D3D2DC', backgroundColor: '#FBFBFD' },
                pressed && { opacity: 0.75 },
              ]}
              onPress={handlePickImage}
              accessibilityLabel={t('community.composer.addPhotoA11y')}
            >
              <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="camera" size={16} color={primaryColor} />
              </View>
              <Typography variant="bodySmall" style={{ color: primaryColor, fontWeight: '700', fontSize: 12.5 }}>
                {t('community.composer.addPhoto')}
              </Typography>
              <Typography variant="caption" style={{ color: '#A7AAB6', fontSize: 11 }}>
                {t('community.composer.photoHint')}
              </Typography>
            </Pressable>
          ) : (
            <View style={styles.imageSection}>
              {/* Preview */}
              <View style={[styles.previewWrap, { aspectRatio: getAspectRatioNumeric(cropRatio) }]}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} resizeMode="cover" />
              </View>

              {/* Actions */}
              <View style={styles.imageActions}>
                <Pressable
                  style={({ pressed }) => [styles.imageActionBtn, { backgroundColor: theme.muted }, pressed && { opacity: 0.7 }]}
                  onPress={handlePickImage}
                >
                  <Typography variant="caption" style={{ fontWeight: '600' }}>
                    {t('community.composer.change')}
                  </Typography>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.imageActionBtn, { backgroundColor: '#fee2e2' }, pressed && { opacity: 0.7 }]}
                  onPress={handleRemoveImage}
                >
                  <Typography variant="caption" style={{ fontWeight: '600', color: '#ef4444' }}>
                    {t('community.composer.remove')}
                  </Typography>
                </Pressable>
              </View>

              {/* Crop Ratio */}
              <View style={styles.cropSection}>
                <Typography variant="caption" color="textSecondary" style={styles.cropLabel}>
                  {t('community.composer.aspectRatio')}
                </Typography>
                <View style={styles.ratioRow}>
                  {CROP_RATIOS.map((r) => {
                    const isActive = cropRatio === r.value;
                    return (
                      <Pressable
                        key={r.value}
                        style={({ pressed }) => [
                          styles.ratioPill,
                          {
                            backgroundColor: isActive ? primaryColor : theme.muted,
                          },
                          pressed && { opacity: 0.75 },
                        ]}
                        onPress={() => setCropRatio(r.value)}
                      >
                        <Typography variant="caption" style={{ color: isActive ? '#fff' : theme.text, fontWeight: '700' }}>
                          {r.label}
                        </Typography>
                        <Typography variant="caption" style={{ color: isActive ? 'rgba(255,255,255,0.75)' : theme.textSecondary, fontSize: 9 }}>
                          {t(`community.composer.crop.${r.sub}`)}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Crop Position Slider */}
              <View style={styles.sliderSection}>
                <View style={styles.sliderHeader}>
                  <Typography variant="caption" color="textSecondary">
                    {t('community.composer.cropPosition')}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {cropPosition}%
                  </Typography>
                </View>
                {/* Native slider using a manual drag control — expo doesn't ship a Slider, use a simple range indicator */}
                <View style={[styles.sliderTrack, { backgroundColor: theme.muted }]}>
                  <Pressable
                    style={[styles.sliderFill, { width: `${cropPosition}%`, backgroundColor: primaryColor }]}
                    onStartShouldSetResponder={() => true}
                  />
                  {/* Accessible slider via quick decrement/increment buttons */}
                </View>
                <View style={styles.sliderButtons}>
                  <Pressable
                    onPress={() => setCropPosition(Math.max(0, cropPosition - 5))}
                    style={({ pressed }) => [styles.sliderBtn, { backgroundColor: theme.muted }, pressed && { opacity: 0.7 }]}
                    hitSlop={8}
                  >
                    <Feather name="minus" size={14} color={theme.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => setCropPosition(Math.min(100, cropPosition + 5))}
                    style={({ pressed }) => [styles.sliderBtn, { backgroundColor: theme.muted }, pressed && { opacity: 0.7 }]}
                    hitSlop={8}
                  >
                    <Feather name="plus" size={14} color={theme.text} />
                  </Pressable>
                </View>
              </View>

              {/* Zoom Slider */}
              <View style={styles.sliderSection}>
                <View style={styles.sliderHeader}>
                  <Typography variant="caption" color="textSecondary">
                    {t('community.composer.zoom')}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {cropZoom}%
                  </Typography>
                </View>
                <View style={[styles.sliderTrack, { backgroundColor: theme.muted }]}>
                  <View
                    style={[
                      styles.sliderFill,
                      {
                        width: `${((cropZoom - 100) / 40) * 100}%`,
                        backgroundColor: primaryColor,
                      },
                    ]}
                  />
                </View>
                <View style={styles.sliderButtons}>
                  <Pressable
                    onPress={() => setCropZoom(Math.max(100, cropZoom - 5))}
                    style={({ pressed }) => [styles.sliderBtn, { backgroundColor: theme.muted }, pressed && { opacity: 0.7 }]}
                    hitSlop={8}
                  >
                    <Feather name="minus" size={14} color={theme.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => setCropZoom(Math.min(140, cropZoom + 5))}
                    style={({ pressed }) => [styles.sliderBtn, { backgroundColor: theme.muted }, pressed && { opacity: 0.7 }]}
                    hitSlop={8}
                  >
                    <Feather name="plus" size={14} color={theme.text} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Submit */}
      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <Button
          label={t(isSubmitting ? 'community.composer.posting' : 'community.composer.submit')}
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          loading={isSubmitting}
          onPress={handleSubmit}
          style={{ borderRadius: 16 }}
        />
        <Typography variant="caption" style={styles.helperText}>
          {!isGlobal
            ? t('community.composer.visibleBranch')
            : postingBlocked
              ? blockedMessage
              : t('community.composer.postingAs', { gym: config.postingGymName ?? t('community.composer.yourGym') })}
        </Typography>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    gap: 4,
    paddingBottom: 24,
  },
  section: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#A7AAB6',
    marginBottom: Spacing.half,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 9,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  typeBtnLabel: {
    fontWeight: '700',
    fontSize: 12,
  },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    paddingVertical: 13,
  },
  textArea: {
    minHeight: 110,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 13,
    fontSize: 14,
  },
  charCount: {
    textAlign: 'right',
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
  },
  photoPlaceholder: {
    paddingVertical: 26,
    paddingHorizontal: 10,
    borderWidth: 1.6,
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FBFBFD',
  },
  imageSection: {
    gap: Spacing.two,
  },
  previewWrap: {
    width: '100%',
    maxHeight: 280,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  imageActionBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  cropSection: {
    gap: Spacing.two,
  },
  cropLabel: {
    fontWeight: '600',
  },
  ratioRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  ratioPill: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    gap: 2,
  },
  sliderSection: {
    gap: Spacing.two,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  sliderButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  sliderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 26,
  },
  helperText: {
    textAlign: 'center',
    fontSize: 11.5,
    color: '#A7AAB6',
    marginTop: 10,
    fontWeight: '500',
  },
});
