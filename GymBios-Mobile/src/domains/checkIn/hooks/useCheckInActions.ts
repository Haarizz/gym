import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkInKeys } from './checkInKeys';
import { CheckInService } from '../application/CheckInService';
import { CheckInApiRepository } from '../infrastructure/CheckInApiRepository';
import { ManualCheckInProvider } from '../application/ManualCheckInProvider';
import type { CheckInRequest } from '../domain';

const repository = new CheckInApiRepository();
const manualProvider = new ManualCheckInProvider(repository);
const checkInService = new CheckInService(repository, manualProvider);

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CheckInRequest) => checkInService.checkIn(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.today() });
    },
  });
}

export function useCreateDeviceKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => checkInService.createDeviceKey(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.deviceKeys() });
    },
  });
}

export function useRevokeDeviceKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => checkInService.revokeDeviceKey(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.deviceKeys() });
    },
  });
}
