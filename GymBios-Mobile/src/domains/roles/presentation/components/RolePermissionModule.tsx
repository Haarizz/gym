import { useState } from 'react';
import { StyleSheet, View, Switch, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Typography } from '@/shared/components/Typography';
import { Spacing, Radius, BrandColors } from '@/core/theme';
import { PERMISSION_ACTIONS } from '../constants/modules';

interface RolePermissionModuleProps {
  moduleName: string;
  selectedKeys: Set<string>;
  onTogglePermission: (key: string) => void;
  onToggleModule: (keys: string[], forceState?: boolean) => void;
}

export function RolePermissionModule({
  moduleName,
  selectedKeys,
  onTogglePermission,
  onToggleModule,
}: RolePermissionModuleProps) {
  const [expanded, setExpanded] = useState(false);

  const moduleKeys = PERMISSION_ACTIONS.map(action => `${moduleName}.${action}`);
  const selectedCount = moduleKeys.filter(key => selectedKeys.has(key)).length;
  const totalCount = PERMISSION_ACTIONS.length;
  const allSelected = selectedCount === totalCount;
  
  const hasSelection = selectedCount > 0;

  const handleSelectAll = (value: boolean) => {
    onToggleModule(moduleKeys, value);
  };

  return (
    <View style={[styles.container, expanded && styles.containerExpanded]}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Typography variant="body" style={styles.moduleName}>
          {moduleName}
        </Typography>
        
        <View style={[styles.badge, hasSelection && styles.badgeActive]}>
          <Typography variant="caption" style={[styles.badgeText, hasSelection && styles.badgeTextActive]}>
            {selectedCount}/{totalCount}
          </Typography>
        </View>
        
        <Feather 
          name="chevron-down" 
          size={18} 
          color={BrandColors.textSecondary} 
          style={[styles.chevron, expanded && styles.chevronExpanded]} 
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.selectAllRow}>
            <Typography variant="bodySmall" style={styles.selectAllText}>
              Select all
            </Typography>
            <Switch
              value={allSelected}
              onValueChange={handleSelectAll}
              trackColor={{ false: '#d1d5db', true: BrandColors.teal }}
              thumbColor={allSelected ? '#fff' : '#f3f4f6'}
            />
          </View>
          
          {PERMISSION_ACTIONS.map(action => {
            const key = `${moduleName}.${action}`;
            const isSelected = selectedKeys.has(key);
            return (
              <View key={action} style={styles.permissionRow}>
                <View style={styles.permissionLabel}>
                  <View style={styles.dot} />
                  <Typography variant="bodySmall" style={{ fontWeight: '500' }}>
                    {action}
                  </Typography>
                </View>
                <Switch
                  value={isSelected}
                  onValueChange={() => onTogglePermission(key)}
                  trackColor={{ false: '#d1d5db', true: BrandColors.teal }}
                  thumbColor={isSelected ? '#fff' : '#f3f4f6'}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: '#e5e9f0',
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
    overflow: 'hidden',
  },
  containerExpanded: {
    // styles when expanded if needed
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
  },
  moduleName: {
    flex: 1,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#eef1f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginRight: Spacing.two,
  },
  badgeActive: {
    backgroundColor: '#e4f3f0',
  },
  badgeText: {
    fontFamily: 'monospace',
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  badgeTextActive: {
    color: BrandColors.tealDark,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  body: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#e5e9f0',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e9f0',
    borderStyle: 'dashed',
    marginBottom: Spacing.one,
  },
  selectAllText: {
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  permissionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e9f0',
  },
});
