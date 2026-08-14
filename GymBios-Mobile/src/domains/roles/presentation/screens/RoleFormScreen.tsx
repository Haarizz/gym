import { useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppHeader } from '@/shared/components/AppHeader';
import { Input } from '@/shared/components/Input';
import { SearchBar } from '@/shared/components/SearchBar';
import { Loader } from '@/shared/components/Loader';
import { BrandColors, Spacing, BottomTabInset } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

import { useRoles } from '../../hooks/useRoles';
import { useRoleActions } from '../../hooks/useRoleActions';
import { useRoleForm } from '../hooks/useRoleForm';
import { ROLE_MODULES } from '../constants/modules';

import { RolePermissionSummary } from '../components/RolePermissionSummary';
import { RolePermissionModule } from '../components/RolePermissionModule';

export function RoleFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isEditing = !!id && id !== 'create';
  const roleId = isEditing ? parseInt(id, 10) : undefined;

  const { loadRole, selectedRole, loading } = useRoles();
  const { createRole, updateRole, submitting } = useRoleActions();

  // Load role on mount if editing
  useEffect(() => {
    if (isEditing && roleId) {
      loadRole(roleId).catch(() => {
        Alert.alert('Error', 'Failed to load role data.');
        router.back();
      });
    }
  }, [isEditing, roleId, loadRole, router]);

  // We conditionally render the form to ensure it mounts with loaded data
  if (isEditing && loading && !selectedRole) {
    return (
      <View style={[styles.container, styles.loaderContainer]}>
        <Loader />
      </View>
    );
  }

  return (
    <RoleFormContent 
      initialData={isEditing ? selectedRole : null} 
      isEditing={isEditing}
      roleId={roleId}
      submitting={submitting}
      onSubmitAction={isEditing ? updateRole : (id, req) => createRole(req)}
      onSuccess={() => router.back()}
    />
  );
}

interface RoleFormContentProps {
  initialData: any;
  isEditing: boolean;
  roleId?: number;
  submitting: boolean;
  onSubmitAction: (id: number, req: any) => Promise<any>;
  onSuccess: () => void;
}

function RoleFormContent({ initialData, isEditing, roleId, submitting, onSubmitAction, onSuccess }: RoleFormContentProps) {
  const {
    roleName,
    setRoleName,
    description,
    setDescription,
    permissions,
    togglePermission,
    toggleModulePermissions,
    moduleSearch,
    setModuleSearch,
    errors,
    validate,
    getFormData,
  } = useRoleForm(initialData);

  const handleSave = () => {
    if (!validate()) return;
    
    const request = getFormData();
    onSubmitAction(roleId || 0, request)
      .then(() => onSuccess())
      .catch((err) => {
        Alert.alert('Error', isEditing ? 'Failed to update role.' : 'Failed to create role.');
      });
  };

  const filteredModules = ROLE_MODULES.filter(m => 
    m.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <AppHeader 
        title={isEditing ? 'Edit Role' : 'Create Role'} 
        subtitle="Employees & Payroll"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={() => onSuccess()}
        rightAction={
          <TouchableOpacity onPress={handleSave} disabled={submitting}>
            <Typography variant="bodySmallBold" color="primaryText">
              {submitting ? 'Saving...' : 'Save'}
            </Typography>
          </TouchableOpacity>
        }
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Input 
            label="Role name"
            placeholder="e.g. Front Desk"
            value={roleName}
            onChangeText={setRoleName}
            error={errors.roleName}
          />
          <Input 
            label="Description"
            placeholder="What this role is for (optional)"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.permissionsContainer}>
          <RolePermissionSummary selectedCount={permissions.size} />
          
          <View style={styles.moduleSearchContainer}>
            <SearchBar
              value={moduleSearch}
              onChangeText={setModuleSearch}
              placeholder="Filter modules..."
            />
          </View>

          <View style={styles.modulesList}>
            {filteredModules.map(moduleName => (
              <RolePermissionModule
                key={moduleName}
                moduleName={moduleName}
                selectedKeys={permissions}
                onTogglePermission={togglePermission}
                onToggleModule={toggleModulePermissions}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.six,
  },
  section: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  permissionsContainer: {
    marginTop: Spacing.two,
  },
  moduleSearchContainer: {
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  modulesList: {
    paddingHorizontal: Spacing.three,
  },
});
