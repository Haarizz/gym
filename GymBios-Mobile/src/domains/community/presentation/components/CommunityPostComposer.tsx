import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Button, Typography } from '@/shared/components';
import { useCreateCommunityPost } from '../../hooks/useCommunityActions';
import type { CropRatio } from '../hooks/useCommunityPostComposer';

const POST_TYPES = [
  { value: 'achievement', label: '🏆 Achievement' },
  { value: 'question', label: '❓ Question' },
  { value: 'tip', label: '💡 Tip' },
] as const;

const CROP_RATIOS: { value: CropRatio; label: string; sub: string }[] = [
  { value: '1:1', label: '1:1', sub: 'Square' },
  { value: '4:5', label: '4:5', sub: 'Portrait' },
  { value: '9:16', label: '9:16', sub: 'Story' },
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
  const theme = useTheme();
  const createPost = useCreateCommunityPost();

  const handlePickImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Gallery access is needed to attach a photo.');
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
          Alert.alert('Error', 'Could not read image data.');
          return;
        }
        const mimeType = asset.mimeType ?? 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${asset.base64}`;
        setImage({ dataUrl, uri: asset.uri });
        setCropPosition(50);
        setCropZoom(100);
      }
    } catch {
      Alert.alert('Error', 'Unable to open image gallery.');
    }
  }, [setImage, setCropPosition, setCropZoom]);

  const handleRemoveImage = useCallback(() => {
    setImage(null);
  }, [setImage]);

  const handleSubmit = useCallback(() => {
    if (!topic.trim()) {
      Alert.alert('Validation', 'Topic is required.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Validation', 'Post content is required.');
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
          Alert.alert('Error', (err as Error)?.message ?? 'Could not create post. Please try again.');
        },
      },
    );
  }, [topic, content, type, image, cropRatio, cropPosition, cropZoom, createPost, onSuccess]);

  const isSubmitting = createPost.isPending;
  const canSubmit = topic.trim().length > 0 && content.trim().length > 0 && !isSubmitting;

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
            Post Type
          </Typography>
          <View style={styles.typeRow}>
            {POST_TYPES.map((pt) => {
              const isActive = type === pt.value;
              return (
                <Pressable
                  key={pt.value}
                  style={({ pressed }) => [
                    styles.typePill,
                    {
                      backgroundColor: isActive ? BrandColors.teal : theme.muted,
                      borderColor: isActive ? BrandColors.teal : 'transparent',
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => setType(pt.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                >
                  <Typography
                    variant="caption"
                    style={[styles.typePillLabel, { color: isActive ? '#fff' : theme.text }]}
                  >
                    {pt.label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Topic */}
        <View style={styles.section}>
          <Typography variant="bodySmallBold" style={styles.label}>
            Topic *
          </Typography>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.muted, color: theme.text, borderColor: theme.border },
            ]}
            placeholder="Workout recap, sprint finisher, recovery win…"
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
            Post Content *
          </Typography>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: theme.muted, color: theme.text, borderColor: theme.border },
            ]}
            placeholder="Share your progress, ask a question, or post a coaching tip…"
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
            Workout Photo (optional)
          </Typography>

          {!image ? (
            <Pressable
              style={({ pressed }) => [
                styles.photoPlaceholder,
                { borderColor: theme.border, backgroundColor: theme.muted },
                pressed && { opacity: 0.75 },
              ]}
              onPress={handlePickImage}
              accessibilityLabel="Add photo"
            >
              <Feather name="image" size={22} color={BrandColors.teal} />
              <Typography variant="bodySmall" style={{ color: BrandColors.teal, fontWeight: '600' }}>
                Add Photo
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
                    Change
                  </Typography>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.imageActionBtn, { backgroundColor: '#fee2e2' }, pressed && { opacity: 0.7 }]}
                  onPress={handleRemoveImage}
                >
                  <Typography variant="caption" style={{ fontWeight: '600', color: '#ef4444' }}>
                    Remove
                  </Typography>
                </Pressable>
              </View>

              {/* Crop Ratio */}
              <View style={styles.cropSection}>
                <Typography variant="caption" color="textSecondary" style={styles.cropLabel}>
                  Aspect Ratio
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
                            backgroundColor: isActive ? BrandColors.teal : theme.muted,
                          },
                          pressed && { opacity: 0.75 },
                        ]}
                        onPress={() => setCropRatio(r.value)}
                      >
                        <Typography variant="caption" style={{ color: isActive ? '#fff' : theme.text, fontWeight: '700' }}>
                          {r.label}
                        </Typography>
                        <Typography variant="caption" style={{ color: isActive ? 'rgba(255,255,255,0.75)' : theme.textSecondary, fontSize: 9 }}>
                          {r.sub}
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
                    Crop Position
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {cropPosition}%
                  </Typography>
                </View>
                {/* Native slider using a manual drag control — expo doesn't ship a Slider, use a simple range indicator */}
                <View style={[styles.sliderTrack, { backgroundColor: theme.muted }]}>
                  <Pressable
                    style={[styles.sliderFill, { width: `${cropPosition}%`, backgroundColor: BrandColors.teal }]}
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
                    Zoom
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
                        backgroundColor: BrandColors.teal,
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
      <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <Button
          label={isSubmitting ? 'Posting…' : 'Post to Community'}
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          loading={isSubmitting}
          onPress={handleSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.one,
    paddingBottom: Spacing.four,
  },
  section: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#64748b',
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  typePill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  typePillLabel: {
    fontWeight: '600',
    fontSize: 13,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    paddingVertical: Spacing.md,
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.md,
    fontSize: 15,
  },
  charCount: {
    textAlign: 'right',
    marginTop: -Spacing.one,
  },
  photoPlaceholder: {
    minHeight: 64,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    flexDirection: 'row',
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
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
