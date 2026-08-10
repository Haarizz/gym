import { useState, useCallback } from 'react';
import type { TrainingStreamFilters } from '../../domain/TrainingStream';

export type HubTab = 'All' | 'Live' | 'Scheduled' | 'Library' | 'Analytics';

export function useTrainingStreamFilters() {
  const [activeTab, setActiveTab] = useState<HubTab>('All');
  const [search, setSearch] = useState('');

  const getQueryFilters = useCallback((): TrainingStreamFilters | undefined => {
    switch (activeTab) {
      case 'Live':
        return { status: 'LIVE', search: search || undefined };
      case 'Scheduled':
        return { status: 'SCHEDULED', search: search || undefined };
      case 'Library':
        return { status: 'COMPLETED', search: search || undefined };
      case 'All':
      default:
        return search ? { search } : undefined;
    }
  }, [activeTab, search]);

  return {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    getQueryFilters,
  };
}
