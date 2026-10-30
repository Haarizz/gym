import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberBookingsRepository } from '../infrastructure/ApiMemberBookingsRepository';
import { CreateMemberBookingRequest, RefundMethod } from '../domain/MemberBookingData';
import { walletKeys } from '../../wallet/useMyWallet';

export const queryKeys = {
  all: ['memberBookings'] as const,
  upcoming: () => [...queryKeys.all, 'upcoming'] as const,
  past: () => [...queryKeys.all, 'past'] as const,
  rejected: () => [...queryKeys.all, 'rejected'] as const,
  stats: () => [...queryKeys.all, 'stats'] as const,
  availableClasses: (date: string) => [...queryKeys.all, 'availableClasses', date] as const,
};

export function useUpcomingBookings() {
  return useQuery({
    queryKey: queryKeys.upcoming(),
    queryFn: () => memberBookingsRepository.getUpcomingBookings(),
  });
}

export function usePastBookings() {
  return useQuery({
    queryKey: queryKeys.past(),
    queryFn: () => memberBookingsRepository.getPastBookings(),
  });
}

export function useRejectedBookings() {
  return useQuery({
    queryKey: queryKeys.rejected(),
    queryFn: () => memberBookingsRepository.getRejectedBookings(),
  });
}

export function useBookingStats() {
  return useQuery({
    queryKey: queryKeys.stats(),
    queryFn: () => memberBookingsRepository.getStats(),
  });
}

// The booking modal stays mounted, so it refetches each time it opens: staff may have
// approved or rejected a payment since, which changes what's bookable.
export function useAvailableClasses(date: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.availableClasses(date),
    queryFn: () => memberBookingsRepository.getAvailableClasses(date),
    enabled,
    staleTime: 0,
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, refundMethod }: { bookingId: number; refundMethod?: RefundMethod }) =>
      memberBookingsRepository.cancelBooking(bookingId, refundMethod),
    onSuccess: () => {
      // Invalidate relevant queries so the UI updates
      queryClient.invalidateQueries({ queryKey: queryKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: queryKeys.past() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'availableClasses'] });
      // A refund lands in the wallet.
      queryClient.invalidateQueries({ queryKey: walletKeys.mine });
    },
  });
}

export function useCreateMemberBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateMemberBookingRequest) => memberBookingsRepository.createBooking(request),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries so the UI updates
      queryClient.invalidateQueries({ queryKey: queryKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rejected() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      // The available classes query caches state based on whether user has booked,
      // so it needs to be invalidated to pick up the confirmed booking state.
      // Since we don't know the date of the class directly from request easily here,
      // we invalidate all availableClasses queries or could parse it if provided.
      queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'availableClasses'] });
      // Part of the price may have come out of the wallet.
      queryClient.invalidateQueries({ queryKey: walletKeys.mine });
    },
  });
}
