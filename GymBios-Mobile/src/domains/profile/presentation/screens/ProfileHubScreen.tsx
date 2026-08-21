import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { ConfirmationModal } from '@/shared/components/ConfirmationModal';
import { useRestoreSession } from '@/domains/auth';

import { useProfile } from '../../hooks/useProfile';
import { useProfileSummary } from '../../hooks/useProfileSummary';
import { useProfileMutations } from '../../hooks/useProfileMutations';
import { ProfileHubHeader } from '../components/ProfileHubHeader';
import { ProfileSummaryCard } from '../components/ProfileSummaryCard';
import { ProfileNavigationRow } from '../components/ProfileNavigationRow';

interface ProfileHubScreenProps {
  onClose: () => void;
  onNavigateToProfile: () => void;
  onNavigateToTargets: () => void;
  onNavigateToPerformance: () => void;
  onNavigateToTransactions: () => void;
  onNavigateToSettings: () => void;
  onLogout?: () => void;
}

export function ProfileHubScreen({
  onClose,
  onNavigateToProfile,
  onNavigateToTargets,
  onNavigateToPerformance,
  onNavigateToTransactions,
  onNavigateToSettings,
  onLogout,
}: ProfileHubScreenProps) {
  const { profile, initials, firstName } = useProfile();
  const { summary } = useProfileSummary();
  const { updatePhoto } = useProfileMutations();
  const { logout, isLoggingOut } = useRestoreSession();

  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleTakePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        await updatePhoto(result.assets[0].uri);
      }
    } catch {
      // Ignored
    }
  }, [updatePhoto]);

  const handleChooseGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        await updatePhoto(result.assets[0].uri);
      }
    } catch {
      // Ignored
    }
  }, [updatePhoto]);

  const handleConfirmLogout = useCallback(() => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  }, [onLogout, logout]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <ProfileHubHeader onClose={onClose} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Summary Card with Avatar & 3 Metrics */}
          <ProfileSummaryCard
            profile={profile}
            summary={summary}
            initials={initials}
            firstName={firstName}
            onEditPhoto={() => setPhotoSheetVisible(true)}
          />

          {/* Navigation Items (5 Destinations) */}
          <View style={styles.navSection}>
            <ProfileNavigationRow
              icon="user"
              title="My Profile"
              subtitle="Personal details & credentials"
              iconBgColor="#eef7f6"
              iconColor={BrandColors.teal}
              onPress={onNavigateToProfile}
            />

            <ProfileNavigationRow
              icon="target"
              title="My Targets"
              subtitle="Active goals & progress"
              iconBgColor="#fef3c7"
              iconColor="#d97706"
              onPress={onNavigateToTargets}
            />

            <ProfileNavigationRow
              icon="activity"
              title="My Performance"
              subtitle="Score, trends & activity stats"
              iconBgColor="#dbeafe"
              iconColor="#2563eb"
              onPress={onNavigateToPerformance}
            />

            <ProfileNavigationRow
              icon="credit-card"
              title="Transactions"
              subtitle="Salary, purchases & earnings"
              iconBgColor="#f3e8ff"
              iconColor="#7c3aed"
              onPress={onNavigateToTransactions}
            />

            <ProfileNavigationRow
              icon="settings"
              title="Settings"
              subtitle="Notifications, accounts & privacy"
              iconBgColor="#f1f5f9"
              iconColor="#475569"
              onPress={onNavigateToSettings}
            />
          </View>

          {/* Distinct Logout Button */}
          <View style={styles.logoutContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
                isLoggingOut && styles.logoutButtonDisabled,
              ]}
              onPress={() => setLogoutModalVisible(true)}
              disabled={isLoggingOut}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#ef4444" style={styles.logoutIcon} />
              ) : (
                <Feather name="log-out" size={18} color="#ef4444" style={styles.logoutIcon} />
              )}
              <Typography variant="body" style={styles.logoutText}>
                {isLoggingOut ? 'Logging out...' : 'Log out'}
              </Typography>
            </Pressable>
          </View>
        </ScrollView>

        {/* Custom Confirmation Modal for Logout */}
        <ConfirmationModal
          visible={logoutModalVisible}
          title="Log out of GymBios?"
          message="Are you sure you want to log out? You will need to sign in again to access your account."
          confirmText="Log out"
          cancelText="Cancel"
          variant="danger"
          icon="log-out"
          loading={isLoggingOut}
          onConfirm={handleConfirmLogout}
          onClose={() => setLogoutModalVisible(false)}
        />

        {/* Photo Options Bottom Sheet */}
        <AppBottomSheet
          visible={photoSheetVisible}
          onClose={() => setPhotoSheetVisible(false)}
          title="Profile Photo"
          subtitle="Choose an option"
        >
          <Pressable
            style={({ pressed }) => [
              styles.sheetOption,
              pressed && styles.sheetOptionPressed,
            ]}
            onPress={() => {
              setPhotoSheetVisible(false);
              handleTakePhoto();
            }}
          >
            <Feather name="camera" size={20} color={BrandColors.teal} style={styles.sheetOptionIcon} />
            <Typography variant="body">Take Photo</Typography>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.sheetOption,
              pressed && styles.sheetOptionPressed,
            ]}
            onPress={() => {
              setPhotoSheetVisible(false);
              handleChooseGallery();
            }}
          >
            <Feather name="image" size={20} color={BrandColors.teal} style={styles.sheetOptionIcon} />
            <Typography variant="body">Choose from Gallery</Typography>
          </Pressable>
        </AppBottomSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  navSection: {
    marginTop: Spacing.three,
  },
  logoutContainer: {
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutButtonPressed: {
    backgroundColor: '#fee2e2',
    transform: [{ scale: 0.985 }],
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutIcon: {
    marginRight: Spacing.two,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  sheetOptionPressed: {
    backgroundColor: '#f1f5f9',
  },
  sheetOptionIcon: {
    marginRight: Spacing.three,
  },
});
