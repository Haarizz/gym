import { useCallback, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { FormSection } from '@/shared/components/FormSection';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Typography } from '@/shared/components/Typography';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { useStaff } from '../hooks/useStaff';

interface StaffDetailScreenProps {
  staffId: string;
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Typography variant="caption" color="textSecondary" style={styles.detailLabel}>
        {label}
      </Typography>
      <Typography variant="bodySmall">{value}</Typography>
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <FormSection title={title}>
      {children}
    </FormSection>
  );
}

export function StaffDetailScreen({
  staffId,
  onBack,
  onDeleted,
  onUpdated,
}: StaffDetailScreenProps) {
  const theme = useTheme();
  const router = useRouter();
  const { selectedStaff, loadStaff, deleteStaff, submitting } = useStaff();

  useEffect(() => {
    loadStaff(staffId);
  }, [staffId, loadStaff]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Staff',
      'Are you sure you want to delete this staff member? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStaff(staffId);
              onDeleted();
            } catch {
              Alert.alert('Error', 'Failed to delete staff member.');
            }
          },
        },
      ],
    );
  }, [staffId, deleteStaff, onDeleted]);

  const handleEdit = useCallback(() => {
    router.push(`/(admin)/staff/edit/${staffId}` as any);
  }, [router, staffId]);

  if (!selectedStaff) {
    return (
      <ScreenLayout>
        <View style={styles.loadingContainer}>
          <Typography variant="body" color="textSecondary">
            Loading...
          </Typography>
        </View>
      </ScreenLayout>
    );
  }

  const initials = selectedStaff.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar
              initials={initials}
              imageUrl={selectedStaff.photoUrl}
              size={72}
            />
            <View style={styles.profileInfo}>
              <Typography variant="subtitle">{selectedStaff.name}</Typography>
              <Typography variant="bodySmall" color="textSecondary">
                {selectedStaff.role}
              </Typography>
              <View style={styles.statusRow}>
                <StatusBadge status={selectedStaff.status} />
              </View>
            </View>
          </View>
        </Card>

        {/* Personal Information */}
        <DetailSection title="Personal Information">
          <DetailRow label="Email" value={selectedStaff.email} />
          <DetailRow label="Phone" value={selectedStaff.phone} />
          <DetailRow label="Address" value={selectedStaff.address} />
        </DetailSection>

        {/* Employment */}
        <DetailSection title="Employment">
          <DetailRow label="Department" value={selectedStaff.department} />
          <DetailRow label="Branch" value={selectedStaff.branch} />
          <DetailRow label="Join Date" value={selectedStaff.joinDate} />
        </DetailSection>

        {/* Compensation */}
        <DetailSection title="Compensation">
          <DetailRow
            label="Base Salary"
            value={`$${selectedStaff.baseSalary.toLocaleString()}`}
          />
          <DetailRow
            label="Monthly Target"
            value={`$${selectedStaff.monthlyTarget.toLocaleString()}`}
          />
        </DetailSection>

        {/* Certifications */}
        {selectedStaff.certifications.length > 0 && (
          <DetailSection title="Certifications">
            {selectedStaff.certifications.map((cert, index) => (
              <View key={index} style={[styles.certItem, { backgroundColor: theme.backgroundElement }]}>
                <Typography variant="bodySmallBold">{cert.certName}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {cert.issuer} · {cert.issueDate} to {cert.expiryDate}
                </Typography>
              </View>
            ))}
          </DetailSection>
        )}

        {/* Schedule */}
        {Object.keys(selectedStaff.schedule).length > 0 && (
          <DetailSection title="Weekly Schedule">
            {Object.entries(selectedStaff.schedule).map(([day, ranges]) => (
              <View key={day} style={styles.scheduleDay}>
                <Typography variant="bodySmallBold" style={styles.scheduleDayLabel}>
                  {day}
                </Typography>
                <Typography variant="bodySmall" color="textSecondary">
                  {ranges.join(', ')}
                </Typography>
              </View>
            ))}
          </DetailSection>
        )}

        {/* App Access */}
        <DetailSection title="App Access">
          <DetailRow
            label="Access Enabled"
            value={selectedStaff.appAccessEnabled ? 'Yes' : 'No'}
          />
          {selectedStaff.appAccessEnabled && selectedStaff.appUsername && (
            <DetailRow label="Username" value={selectedStaff.appUsername} />
          )}
        </DetailSection>

        {/* Actions */}
        <View style={styles.actions}>
          <Button label="Edit Staff" onPress={handleEdit} size="lg" />
          <Button
            label="Delete Staff"
            variant="secondary"
            onPress={handleDelete}
            loading={submitting}
            size="lg"
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  profileInfo: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  statusRow: {
    marginTop: Spacing.one,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  detailLabel: {
    flex: 1,
  },
  certItem: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  scheduleDay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  scheduleDayLabel: {
    flex: 1,
  },
  actions: {
    gap: Spacing.three,
  },
});