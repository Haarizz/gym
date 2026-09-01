import { useQuery } from '@tanstack/react-query';
import { checkInKeys } from './checkInKeys';
import { useBranchContext } from '@/shared/providers/BranchProvider';
import { CheckInService } from '../application/CheckInService';
import { CheckInApiRepository } from '../infrastructure/CheckInApiRepository';
import { ManualCheckInProvider } from '../application/ManualCheckInProvider';

const repository = new CheckInApiRepository();
const manualProvider = new ManualCheckInProvider(repository);
const checkInService = new CheckInService(repository, manualProvider);

export function useTodayAttendance() {
  const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...checkInKeys.today(), selectedBranchId],
    queryFn: () => checkInService.getTodayAttendance(),
  });
}

export function useCheckInStatus(identifier: { qr?: string; faceId?: string; memberId?: number }) {
  const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...checkInKeys.status(identifier), selectedBranchId],
    queryFn: () => checkInService.getStatus(identifier.qr, identifier.faceId, identifier.memberId),
    enabled: !!identifier.qr || !!identifier.faceId || !!identifier.memberId,
  });
}
