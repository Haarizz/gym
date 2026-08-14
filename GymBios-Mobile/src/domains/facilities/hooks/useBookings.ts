import { useQuery } from '@tanstack/react-query';
import { ApiFacilityRepository } from '../infrastructure/ApiFacilityRepository';
import type { BookingFilters } from '../domain/Booking';

const repository = new ApiFacilityRepository();

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters?: BookingFilters) => [...bookingKeys.lists(), filters] as const,
};

export function useBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: () => repository.getBookings(filters),
  });
}
