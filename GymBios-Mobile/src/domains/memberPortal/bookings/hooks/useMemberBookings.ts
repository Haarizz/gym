import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberBookingsRepository } from '../infrastructure/ApiMemberBookingsRepository';
import { CreateMemberBookingRequest } from '../domain/MemberBookingData';

export const queryKeys = {
  all: ['memberBookings'] as const,
  upcoming: () => [...queryKeys.all, 'upcoming'] as const,
  past: () => [...queryKeys.all, 'past'] as const,
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

export function useBookingStats() {
  return useQuery({
    queryKey: queryKeys.stats(),
    queryFn: () => memberBookingsRepository.getStats(),
  });
}

export function useAvailableClasses(date: string) {
  return useQuery({
    queryKey: queryKeys.availableClasses(date),
    queryFn: () => memberBookingsRepository.getAvailableClasses(date),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: number) => memberBookingsRepository.cancelBooking(bookingId),
    onSuccess: () => {
      // Invalidate relevant queries so the UI updates
      queryClient.invalidateQueries({ queryKey: queryKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      // The available classes query caches state based on whether user has booked,
      // so it needs to be invalidated to pick up the confirmed booking state.
      // Since we don't know the date of the class directly from request easily here,
      // we invalidate all availableClasses queries or could parse it if provided.
      queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'availableClasses'] });
    },
  });
}
