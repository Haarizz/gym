import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/shared/components/Card';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Spacing, Radius } from '@/core/theme';
import type { Role } from '../../domain/Role';
import { ROLE_MODULES, PERMISSION_ACTIONS } from '../constants/modules';

interface RoleCardProps {
  role: Role;
  onActionsPress: (role: Role) => void;
}

export function RoleCard({ role, onActionsPress }: RoleCardProps) {
  const totalPermissions = ROLE_MODULES.length * PERMISSION_ACTIONS.length;
  const permissionCount = role.permissionKeys?.length || 0;
  const isAllAccess = permissionCount === totalPermissions;

  // The bar consists of 10 segments for visual representation
  const segments = 10;
  const filledSegments = isAllAccess ? segments : Math.round((permissionCount / totalPermissions) * segments);

  return (
    <Card style={styles.card}>
      <View style={styles.main}>
        <View style={styles.nameRow}>
          <Typography variant="body" style={styles.roleName}>{role.roleName}</Typography>
          
          {role.isSystem && (
            <View style={styles.systemBadge}>
              <Feather name="lock" size={10} color={BrandColors.textSecondary} />
              <Typography variant="caption" style={styles.systemBadgeText}>System</Typography>
            </View>
          )}
          
          {isAllAccess && (
            <View style={styles.allAccessBadge}>
              <Feather name="zap" size={10} color={BrandColors.tealDark} />
              <Typography variant="caption" style={styles.allAccessText}>All access</Typography>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <Typography variant="caption" style={styles.permCount}>
            {isAllAccess ? 'All modules' : `${permissionCount} permission${permissionCount === 1 ? '' : 's'}`}
          </Typography>
          <View style={styles.dot} />
          <Typography variant="caption" color="textSecondary">
            {role.userCount} user{role.userCount === 1 ? '' : 's'}
          </Typography>
        </View>

        <View style={styles.permBar}>
          {Array.from({ length: segments }).map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.segment, 
                i < filledSegments && (isAllAccess ? styles.segmentAll : styles.segmentOn)
              ]} 
            />
          ))}
        </View>
      </View>

      <TouchableOpacity 
        style={styles.actionsBtn} 
        onPress={() => onActionsPress(role)}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        <Feather name="more-vertical" size={18} color={BrandColors.textSecondary} />
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  main: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  roleName: {
    fontWeight: '700',
    marginRight: Spacing.one,
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF1F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 2,
  },
  systemBadgeText: {
    fontWeight: '600',
    color: BrandColors.textSecondary,
    fontSize: 10,
  },
  allAccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4F3F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 2,
  },
  allAccessText: {
    fontWeight: '600',
    color: BrandColors.tealDark,
    fontSize: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  permCount: {
    fontFamily: 'monospace',
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: BrandColors.textSecondary,
  },
  permBar: {
    flexDirection: 'row',
    gap: 2,
  },
  segment: {
    height: 4,
    flex: 1,
    backgroundColor: '#E5E9F0',
    borderRadius: 2,
  },
  segmentOn: {
    backgroundColor: BrandColors.teal,
  },
  segmentAll: {
    backgroundColor: BrandColors.tealDark,
  },
  actionsBtn: {
    padding: Spacing.one,
    marginLeft: Spacing.two,
  },
});
