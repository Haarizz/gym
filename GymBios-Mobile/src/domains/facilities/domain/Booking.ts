export interface Booking {
  id: string;
  sessionId?: string;
  sessionName?: string;
  trainerName?: string;
  date?: string;
  startTime?: string;
  type?: 'class' | 'pt' | 'facility' | string;
  status?: 'confirmed' | 'checked-in' | 'no-show' | 'cancelled' | string;
  paymentStatus?: 'paid' | 'pay_later' | string;
  price?: number;
  qrCode?: string;
  guest?: boolean;
  memberId?: string;
  memberName?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  createdAt?: string;
}

export interface BookingFilters {
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}
