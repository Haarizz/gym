import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AvatarPicker } from '@/shared/components/AvatarPicker';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { GlassBlob, GlassHeader, GlassSurface, InfoRow } from '@/shared/components';

import { useProfile } from '../../hooks/useProfile';
import { useProfileMutations } from '../../hooks/useProfileMutations';
import { AddressAutocomplete } from '../components/AddressAutocomplete';

import { toast } from '@/shared/components/Toasts/toastStore';

interface MyProfileScreenProps {
  onBack: () => void;
}

export function MyProfileScreen({ onBack }: MyProfileScreenProps) {
  const { profile } = useProfile();
  const {
    updateProfile,
    isUpdatingProfile,
    updatePhoto,
    changePassword,
    isChangingPassword,
  } = useProfileMutations();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedAddress, setEditedAddress] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleStartEdit = () => {
    setEditedName(profile?.name || '');
    setEditedEmail(profile?.email || '');
    setEditedPhone(profile?.phone || '');
    setEditedAddress(profile?.address || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim() || !editedEmail.trim()) {
      toast.error('Name and email are required.', {
        title: 'Validation Error'
      });
      return;
    }

    try {
      await updateProfile({
        name: editedName.trim(),
        email: editedEmail.trim(),
        phone: editedPhone.trim(),
        address: editedAddress.trim(),
      });
      setIsEditing(false);
      toast.success('Profile updated successfully.', {
        title: 'Success'
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile.', {
        title: 'Error'
      });
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password.', {
        title: 'Validation Error'
      });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.', {
        title: 'Validation Error'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match.', {
        title: 'Validation Error'
      });
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully.', {
        title: 'Success'
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password.', {
        title: 'Error'
      });
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <GlassBlob color={BrandColors.teal} size={320} opacity={0.34} top={-40} right={-70} />
      <GlassBlob color={BrandColors.memberGold} size={280} opacity={0.26} top={380} left={-80} />
      <GlassBlob color={BrandColors.tealDark} size={240} opacity={0.2} top={800} right={-70} />

      <GlassHeader
        title="My Profile"
        subtitle="Manage your personal details & credentials"
        onBack={onBack}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section with AvatarPicker */}
          <View style={styles.avatarSection}>
            <AvatarPicker
              name={profile?.name || 'User'}
              photoUrl={profile?.photoUrl}
              onChangePhoto={async (uri) => {
                if (uri) {
                  await updatePhoto(uri);
                }
              }}
            />
            <Typography variant="title" style={styles.profileName}>
              {profile?.name}
            </Typography>
            <Typography variant="bodySmall" color="textSecondary">
              {profile?.role} · {profile?.department}
            </Typography>
          </View>

          {/* Personal Information Card */}
          <GlassSurface radius={Radius.lg} style={styles.card}>
            <View style={styles.cardHeader}>
              <Typography variant="subtitle" style={styles.cardTitle}>
                Personal Information
              </Typography>
              <Pressable
                onPress={isEditing ? handleCancelEdit : handleStartEdit}
                style={styles.editPill}
                accessibilityRole="button"
                accessibilityLabel={isEditing ? 'Cancel editing' : 'Edit personal information'}
              >
                <Feather
                  name={isEditing ? 'x' : 'edit-2'}
                  size={12}
                  color={BrandColors.tealDark}
                  style={styles.editPillIcon}
                />
                <Typography variant="caption" style={styles.editPillText}>
                  {isEditing ? 'Cancel' : 'Edit'}
                </Typography>
              </Pressable>
            </View>

            {isEditing ? (
              <View style={styles.form}>
                <Input
                  variant="glass"
                  label="Full Name"
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Enter full name"
                />

                <Input
                  variant="glass"
                  label="Email Address"
                  value={editedEmail}
                  onChangeText={setEditedEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Enter email address"
                />

                <Input
                  variant="glass"
                  label="Phone Number"
                  value={editedPhone}
                  onChangeText={setEditedPhone}
                  keyboardType="phone-pad"
                  placeholder="Enter phone number"
                />

                <View style={{ zIndex: 10 }}>
                  <AddressAutocomplete
                    label="Address"
                    value={editedAddress}
                    onChange={setEditedAddress}
                  />
                </View>

                <Button
                  title="Save Changes"
                  variant="primary"
                  loading={isUpdatingProfile}
                  onPress={handleSaveProfile}
                  style={styles.saveButton}
                />
              </View>
            ) : (
              <View>
                <InfoRow icon="user" label="Full Name" value={profile?.name} divider={false} />
                <InfoRow icon="mail" label="Email Address" value={profile?.email} />
                <InfoRow icon="phone" label="Phone Number" value={profile?.phone} />
                <InfoRow icon="map-pin" label="Address" value={profile?.address} />

                {profile?.staffId && (
                  <View style={styles.metaRow}>
                    <View style={styles.metaCell}>
                      <Typography variant="caption" color="textSecondary" style={styles.metaLabel}>
                        Employee ID
                      </Typography>
                      <Typography variant="body" style={styles.metaValue}>
                        {profile.staffId}
                      </Typography>
                    </View>
                    <View style={styles.metaCell}>
                      <Typography variant="caption" color="textSecondary" style={styles.metaLabel}>
                        Join Date
                      </Typography>
                      <Typography variant="body" style={styles.metaValue}>
                        {profile.joinDate || '—'}
                      </Typography>
                    </View>
                  </View>
                )}
              </View>
            )}
          </GlassSurface>

          {/* Change Password Card */}
          <GlassSurface radius={Radius.lg} style={styles.card}>
            <View style={styles.cardHeader}>
              <Typography variant="subtitle" style={styles.cardTitle}>
                Change Password
              </Typography>
            </View>

            <View style={styles.form}>
              <Input
                variant="glass"
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
              />

              <Input
                variant="glass"
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password (min. 8 chars)"
              />

              <Input
                variant="glass"
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm new password"
              />

              <Button
                title="Update Password"
                variant="primary"
                loading={isChangingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
                onPress={handleChangePassword}
                style={styles.saveButton}
              />
            </View>
          </GlassSurface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginTop: Spacing.two,
  },
  card: {
    padding: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  form: {
    gap: Spacing.three,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  editPillIcon: {
    marginRight: 4,
  },
  editPillText: {
    color: BrandColors.tealDark,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30,42,58,0.08)',
  },
  metaCell: {
    flex: 1,
  },
  metaLabel: {
    fontWeight: '700',
    marginBottom: 3,
  },
  metaValue: {
    fontWeight: '800',
  },
  saveButton: {
    marginTop: Spacing.two,
  },
});
