import { useState, useCallback } from 'react';
import type { TrainerSessionItem } from '../../domain/TrainerScheduleData';

export type SheetMode = 'closed' | 'create' | 'details' | 'edit' | 'delete' | 'update_availability';

export function useScheduleSheet() {
  const [mode, setMode] = useState<SheetMode>('closed');
  const [selectedSession, setSelectedSession] = useState<TrainerSessionItem | null>(null);

  const openCreate = useCallback(() => {
    setSelectedSession(null);
    setMode('create');
  }, []);

  const openDetails = useCallback((session: TrainerSessionItem) => {
    setSelectedSession(session);
    setMode('details');
  }, []);

  const openEdit = useCallback(() => {
    if (selectedSession) {
      setMode('edit');
    }
  }, [selectedSession]);

  const openDelete = useCallback(() => {
    if (selectedSession) {
      setMode('delete');
    }
  }, [selectedSession]);

  const openUpdateAvailability = useCallback(() => {
    setMode('update_availability');
  }, []);

  const closeSheet = useCallback(() => {
    setMode('closed');
    // We optionally keep selectedSession so animations finish gracefully
  }, []);

  return {
    mode,
    selectedSession,
    openCreate,
    openDetails,
    openEdit,
    openDelete,
    openUpdateAvailability,
    closeSheet,
  };
}
