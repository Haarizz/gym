import { StyleSheet, View } from 'react-native';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components';

import { useCommunityPostComposer } from '../hooks/useCommunityPostComposer';
import { CommunityPostComposer } from '../components/CommunityPostComposer';

/**
 * Full-screen Create Post route.
 * Opened via router.push('/(member)/create-community-post') from the Community FAB.
 * Closed via router.back() on success or cancel.
 */
export function CreateCommunityPostScreen() {
  const { primaryColor, headerColors } = useCommunityTheme();
  const router = useRouter();
  const theme = useTheme();
  const composer = useCommunityPostComposer();

  const handleSuccess = () => {
    composer.reset();
    router.back();
  };

  const handleCancel = () => {
    composer.reset();
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6 }]}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={8}
        >
          <Typography variant="bodySmallBold" style={{ color: '#7A7E8C', fontSize: 14 }}>
            Cancel
          </Typography>
        </Pressable>

        <Typography variant="bodySmallBold" style={styles.headerTitle}>
          Create Post
        </Typography>

        <View style={styles.headerSpacer} />
      </View>

      {/* Composer */}
      <CommunityPostComposer
        topic={composer.topic}
        setTopic={composer.setTopic}
        type={composer.type}
        setType={composer.setType}
        content={composer.content}
        setContent={composer.setContent}
        image={composer.image}
        setImage={composer.setImage}
        cropRatio={composer.cropRatio}
        setCropRatio={composer.setCropRatio}
        cropPosition={composer.cropPosition}
        setCropPosition={composer.setCropPosition}
        cropZoom={composer.cropZoom}
        setCropZoom={composer.setCropZoom}
        onSuccess={handleSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  cancelBtn: {
    minWidth: 60,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    marginRight: 38,
  },
  headerSpacer: {
    width: 0,
  },
});
