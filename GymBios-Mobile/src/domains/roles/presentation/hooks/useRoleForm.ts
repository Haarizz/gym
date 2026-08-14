import { useState, useCallback } from 'react';
import type { Role } from '../../domain/Role';
import type { RoleRequest } from '../../application/RoleRepository';

export function useRoleForm(initialData?: Role | null) {
  const [roleName, setRoleName] = useState(initialData?.roleName || '');
  const [description, setDescription] = useState(initialData?.description || '');
  
  const [permissions, setPermissions] = useState<Set<string>>(() => {
    return new Set(initialData?.permissionKeys || []);
  });

  const [moduleSearch, setModuleSearch] = useState('');
  const [errors, setErrors] = useState<{ roleName?: string }>({});

  const togglePermission = useCallback((key: string) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleModulePermissions = useCallback((keys: string[], forceState?: boolean) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      const allSelected = keys.every(k => next.has(k));
      const shouldSelect = forceState !== undefined ? forceState : !allSelected;
      
      keys.forEach((key) => {
        if (shouldSelect) {
          next.add(key);
        } else {
          next.delete(key);
        }
      });
      return next;
    });
  }, []);

  const validate = useCallback(() => {
    const newErrors: { roleName?: string } = {};
    if (!roleName.trim()) {
      newErrors.roleName = 'Role name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [roleName]);

  const getFormData = useCallback((): RoleRequest => {
    return {
      roleName: roleName.trim(),
      description: description.trim(),
      permissionKeys: Array.from(permissions),
    };
  }, [roleName, description, permissions]);

  return {
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
  };
}
