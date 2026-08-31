import { useQuery } from '@tanstack/react-query';
import { ApiFacilityRepository } from '../infrastructure/ApiFacilityRepository';
import type { BookingFilters } from '../domain/Booking';
import { useBranchContext } from "@/shared/providers/BranchProvider";

const repository = new ApiFacilityRepository();

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters?: BookingFilters) => [...bookingKeys.lists(), filters] as const,
};

export function useBookings(filters?: BookingFilters) {
    const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...(Array.isArray(bookingKeys.list(filters)) ? bookingKeys.list(filters) : [bookingKeys.list(filters)]), selectedBranchId],
    queryFn: () => repository.getBookings(filters),
  });
}
