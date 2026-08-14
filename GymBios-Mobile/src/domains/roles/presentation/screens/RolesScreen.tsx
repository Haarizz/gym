import { useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/shared/components/AppHeader';
import { SearchBar } from '@/shared/components/SearchBar';
import { Loader } from '@/shared/components/Loader';
import { BrandColors, Spacing, BottomTabInset } from '@/core/theme';

import { useRoleSearch } from '../hooks/useRoleSearch';
import { useRoleActions } from '../../hooks/useRoleActions';
import type { Role } from '../../domain/Role';
import { RoleCard } from '../components/RoleCard';
import { RoleEmptyState } from '../components/RoleEmptyState';
import { RoleActionsMenu } from '../components/RoleActionsMenu';

export function RolesScreen() {
  const router = useRouter();
  const { roles, loading, search, setSearch } = useRoleSearch();
  const { deleteRole, duplicateRole } = useRoleActions();
  
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleCreateRole = () => {
    router.push('/(admin)/roles/create');
  };

  const handleActionsPress = (role: Role) => {
    setSelectedRole(role);
    setMenuVisible(true);
  };

  const handleEditRole = (role: Role) => {
    router.push(`/(admin)/roles/${role.id}`);
  };

  const handleDuplicateRole = (role: Role) => {
    duplicateRole(role.id).catch(err => {
      Alert.alert('Error', 'Failed to duplicate role.');
    });
  };

  const handleDeleteRole = (role: Role) => {
    Alert.alert(
      'Delete Role?',
      `Are you sure you want to delete\n"${role.roleName}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            deleteRole(role.id).catch(err => {
              Alert.alert('Error', 'Unable to delete role.');
            });
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.searchContainer}>
        <SearchBar 
          value={search}
          onChangeText={setSearch}
          placeholder="Search roles..."
        />
      </View>

      {loading && roles.length === 0 ? (
        <Loader style={styles.loader} />
      ) : (
        <FlatList
          data={roles}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <RoleCard 
              role={item} 
              onActionsPress={handleActionsPress}
            />
          )}
          ListEmptyComponent={
            <RoleEmptyState 
              searchQuery={search} 
              onClearSearch={() => setSearch('')}
              onCreateRole={handleCreateRole}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleCreateRole}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <RoleActionsMenu
        role={selectedRole}
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onEdit={handleEditRole}
        onDuplicate={handleDuplicateRole}
        onDelete={handleDeleteRole}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  searchContainer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: BrandColors.screenBackground,
  },
  loader: {
    marginTop: Spacing.six,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + 80, // Extra space for FAB
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + 80, // Increased to clear custom center tab button
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: BrandColors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BrandColors.tealDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
});
