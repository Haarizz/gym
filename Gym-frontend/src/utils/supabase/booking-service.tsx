import { authService } from "./auth-service";

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface BookingApi {
  id: string;
  sessionId?: string | null;
  sessionName?: string | null;
  trainerName?: string | null;
  date?: string | null;
  startTime?: string | null;
  type?: 'class' | 'pt' | 'facility' | null;
  status?: 'confirmed' | 'checked-in' | 'no-show' | 'cancelled' | null;
  paymentStatus?: 'paid' | 'pay_later' | null;
  price?: number | null;
  qrCode?: string | null;
  guest?: boolean | null;
  memberId?: string | null;
  memberName?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  createdAt?: string | null;
}

export interface BookingRequest {
  sessionId: number;
  memberId?: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  status?: string;
}

class BookingService {
  private normalizeBooking(raw: any): BookingApi {
    return {
      id: raw.id,
      sessionId: raw.sessionId ?? raw.session_id ?? null,
      sessionName: raw.sessionName ?? raw.session_name ?? null,
      trainerName: raw.trainerName ?? raw.trainer_name ?? null,
      date: raw.date ?? null,
      startTime: raw.startTime ?? raw.start_time ?? null,
      type: raw.type ?? null,
      status: raw.status ?? null,
      price: raw.price ?? null,
      qrCode: raw.qrCode ?? raw.qr_code ?? null,
      guest: raw.guest ?? raw.is_guest ?? null,
      memberId: raw.memberId ?? raw.member_id ?? null,
      memberName: raw.memberName ?? raw.member_name ?? null,
      guestName: raw.guestName ?? raw.guest_name ?? null,
      guestEmail: raw.guestEmail ?? raw.guest_email ?? null,
      guestPhone: raw.guestPhone ?? raw.guest_phone ?? null,
      createdAt: raw.createdAt ?? raw.created_at ?? null,
      paymentStatus: raw.paymentStatus ?? raw.payment_status ?? null,
    };
  }

  async getBookings(params: {
    status?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}): Promise<BookingApi[]> {
    const query = new URLSearchParams();
    if (params.status) query.append("status", params.status);
    if (params.type) query.append("type", params.type);
    if (params.startDate) query.append("startDate", params.startDate);
    if (params.endDate) query.append("endDate", params.endDate);
    if (params.search) query.append("search", params.search);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/bookings?${query.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch bookings: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data.map((item) => this.normalizeBooking(item)) : [];
  }

  async createBooking(payload: BookingRequest): Promise<BookingApi> {
    const body = {
      session_id: payload.sessionId,
      member_id: payload.memberId ?? null,
      guest_name: payload.guestName ?? null,
      guest_email: payload.guestEmail ?? null,
      guest_phone: payload.guestPhone ?? null,
      status: payload.status ?? null,
    };
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/bookings`,
      { method: "POST", body: JSON.stringify(body) }
    );
    if (!response.ok) throw new Error(`Failed to create booking: ${response.status}`);
    return this.normalizeBooking(await response.json());
  }

  async updateStatus(id: string, status: string): Promise<BookingApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/bookings/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    );
    if (!response.ok) throw new Error(`Failed to update booking: ${response.status}`);
    return this.normalizeBooking(await response.json());
  }

  async markAsPaid(id: string): Promise<BookingApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/bookings/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ payment_status: "paid" }) }
    );
    if (!response.ok) throw new Error(`Failed to mark as paid: ${response.status}`);
    return this.normalizeBooking(await response.json());
  }

  async deleteBooking(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/bookings/${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error(`Failed to delete booking: ${response.status}`);
  }
}

export const bookingService = new BookingService();
