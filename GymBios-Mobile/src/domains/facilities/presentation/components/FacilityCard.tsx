import { StyleSheet, View, Switch, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/shared/components/Card';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Spacing } from '@/core/theme';
import type { Facility } from '../../domain/Facility';

interface FacilityCardProps {
  facility: Facility;
  onEdit: (facility: Facility) => void;
  onToggleStatus: (facility: Facility) => void;
  isToggling?: boolean;
}

export function FacilityCard({ facility, onEdit, onToggleStatus, isToggling }: FacilityCardProps) {
  const isActive = facility.status === 'Active';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {facility.iconName ? (
            <Feather name={facility.iconName as any} size={18} color={BrandColors.teal} style={styles.icon} />
          ) : (
            <Feather name="box" size={18} color={BrandColors.teal} style={styles.icon} />
          )}
          <View>
            <Typography variant="body" style={{ fontWeight: '700' }}>{facility.name}</Typography>
            {facility.facilityId && (
              <Typography variant="caption" color="textSecondary">
                ID: {facility.facilityId}
              </Typography>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={() => onEdit(facility)} style={styles.editBtn}>
          <Feather name="edit-2" size={16} color={BrandColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {facility.description && (
        <Typography variant="bodySmall" color="textSecondary" style={styles.description}>
          {facility.description}
        </Typography>
      )}

      <View style={styles.detailsGrid}>
        {facility.occupancyLimit !== undefined && (
          <View style={styles.detailItem}>
            <Feather name="users" size={14} color={BrandColors.textSecondary} />
            <Typography variant="caption" color="textSecondary">
              Limit: {facility.occupancyLimit}
            </Typography>
          </View>
        )}
        
        {facility.rates && Object.keys(facility.rates).length > 0 && (
          <View style={styles.detailItem}>
            <Feather name="dollar-sign" size={14} color={BrandColors.textSecondary} />
            <Typography variant="caption" color="textSecondary">
              {Object.keys(facility.rates).length} Rates Configured
            </Typography>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.statusContainer}>
          <Typography variant="caption" color={isActive ? 'primary' : 'textSecondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Typography>
          <Switch
            value={isActive}
            onValueChange={() => onToggleStatus(facility)}
            disabled={isToggling}
            trackColor={{ false: '#d1d5db', true: '#34d399' }}
            thumbColor={isActive ? '#10b981' : '#f3f4f6'}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  icon: {
    marginTop: 2,
  },
  editBtn: {
    padding: Spacing.one,
  },
  description: {
    marginBottom: Spacing.three,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
