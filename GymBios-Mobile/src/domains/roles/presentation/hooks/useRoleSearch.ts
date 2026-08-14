import { useState, useEffect } from 'react';
import { useRoles } from '../../hooks/useRoles';

export function useRoleSearch() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const rolesContext = useRoles({ search: debouncedSearch || undefined });

  return {
    search,
    setSearch,
    ...rolesContext,
  };
}
