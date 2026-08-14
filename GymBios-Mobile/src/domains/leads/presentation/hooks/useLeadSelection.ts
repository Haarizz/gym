import { useCallback, useState } from 'react';

export function useLeadSelection() {
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);

  const selectedCount = selectedLeadIds.length;
  const hasSelection = selectedCount > 0;

  const isSelected = useCallback(
    (id: number) => selectedLeadIds.includes(id),
    [selectedLeadIds],
  );

  const toggleSelection = useCallback((id: number) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
    );
  }, []);

  const selectAll = useCallback((ids: number[]) => {
    setSelectedLeadIds(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLeadIds([]);
  }, []);

  return {
    selectedLeadIds,
    selectedCount,
    hasSelection,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
  };
}
