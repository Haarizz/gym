import { authService } from "./auth-service";

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface TrainingSessionApi {
  id: string;
  name: string;
  type: 'class' | 'pt' | 'facility';
  trainerId?: number | null;
  trainerName?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number | null;
  location?: string | null;
  capacity?: number | null;
  booked?: number | null;
  price?: number | null;
  status?: string | null;
  description?: string | null;
  checkedIn?: number;
  waitlisted?: number;
  reviewCount?: number;
  averageRating?: number | null;
  trainerPhotoUrl?: string | null;
}

/** active = scheduled; the Trainings & Classes row actions move it along. */
export type SessionStatus = "active" | "in_progress" | "completed" | "cancelled";

export interface SessionTrainerProfile {
  id: number;
  name: string;
  role?: string | null;
  photoUrl?: string | null;
  yearsAtGym?: number | null;
  rating?: number | null;
  ratingCount?: number;
  certifications: string[];
}

export interface SessionParticipant {
  bookingId: string;
  memberDbId?: number | null;
  memberCode?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  plan?: string | null;
  membershipStatus?: string | null;
  guest: boolean;
  /** confirmed | checked-in | no-show | pending_approval | waitlisted */
  status: string;
  paymentStatus?: string | null;
  price?: number | null;
  /** Set when the booking used one of the member's PT package sessions. */
  enrolmentId?: number | null;
  waitlistPosition?: number | null;
  checkedInAt?: string | null;
  bookedAt?: string | null;
}

export interface SessionReviewItem {
  id: number;
  memberDbId?: number | null;
  memberName?: string | null;
  memberPhotoUrl?: string | null;
  rating: number;
  comment?: string | null;
  createdAt?: string | null;
}

export interface SessionOverview {
  session: TrainingSessionApi;
  trainer: SessionTrainerProfile | null;
  participants: SessionParticipant[];
  reviews: SessionReviewItem[];
}

export interface TrainingSessionRequest {
  name: string;
  type: 'class' | 'pt' | 'facility';
  trainerId?: number | null;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number | null;
  location?: string | null;
  capacity?: number | null;
  price?: number | null;
  status?: string | null;
  description?: string | null;
}

class TrainingService {
  private normalizeSession(raw: any): TrainingSessionApi {
    return {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      trainerId: raw.trainerId ?? raw.trainer_id ?? null,
      trainerName: raw.trainerName ?? raw.trainer_name ?? null,
      date: raw.date,
      startTime: raw.startTime ?? raw.start_time,
      endTime: raw.endTime ?? raw.end_time,
      durationMinutes: raw.durationMinutes ?? raw.duration_minutes ?? null,
      location: raw.location ?? null,
      capacity: raw.capacity ?? null,
      booked: raw.booked ?? null,
      price: raw.price ?? null,
      status: raw.status ?? null,
      description: raw.description ?? null,
      checkedIn: Number(raw.checked_in ?? raw.checkedIn ?? 0),
      waitlisted: Number(raw.waitlisted ?? 0),
      reviewCount: Number(raw.review_count ?? raw.reviewCount ?? 0),
      averageRating: raw.average_rating ?? raw.averageRating ?? null,
      trainerPhotoUrl: raw.trainer_photo_url ?? raw.trainerPhotoUrl ?? null,
    };
  }

  private async failure(response: Response, fallback: string): Promise<Error> {
    const err = await response.json().catch(() => ({}));
    return new Error((err as any)?.message || fallback);
  }

  async getSessions(params: {
    type?: string;
    trainerId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}): Promise<TrainingSessionApi[]> {
    const query = new URLSearchParams();
    if (params.type) query.append("type", params.type);
    if (params.trainerId) query.append("trainerId", String(params.trainerId));
    if (params.startDate) query.append("startDate", params.startDate);
    if (params.endDate) query.append("endDate", params.endDate);
    if (params.search) query.append("search", params.search);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/sessions?${query.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch sessions: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data.map((item) => this.normalizeSession(item)) : [];
  }

  async createSession(payload: TrainingSessionRequest): Promise<TrainingSessionApi> {
    const body = {
      name: payload.name,
      type: payload.type,
      trainer_id: payload.trainerId ?? null,
      date: payload.date,
      start_time: payload.startTime,
      end_time: payload.endTime,
      duration_minutes: payload.durationMinutes ?? null,
      location: payload.location ?? null,
      capacity: payload.capacity ?? null,
      price: payload.price ?? null,
      status: payload.status ?? null,
      description: payload.description ?? null,
    };
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/sessions`,
      { method: "POST", body: JSON.stringify(body) }
    );
    if (!response.ok) throw new Error(`Failed to create session: ${response.status}`);
    return this.normalizeSession(await response.json());
  }

  async updateSession(id: string, payload: Partial<TrainingSessionRequest>): Promise<TrainingSessionApi> {
    const body = {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.type !== undefined ? { type: payload.type } : {}),
      ...(payload.trainerId !== undefined ? { trainer_id: payload.trainerId } : {}),
      ...(payload.date !== undefined ? { date: payload.date } : {}),
      ...(payload.startTime !== undefined ? { start_time: payload.startTime } : {}),
      ...(payload.endTime !== undefined ? { end_time: payload.endTime } : {}),
      ...(payload.durationMinutes !== undefined ? { duration_minutes: payload.durationMinutes } : {}),
      ...(payload.location !== undefined ? { location: payload.location } : {}),
      ...(payload.capacity !== undefined ? { capacity: payload.capacity } : {}),
      ...(payload.price !== undefined ? { price: payload.price } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
    };
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/sessions/${id}`,
      { method: "PUT", body: JSON.stringify(body) }
    );
    if (!response.ok) throw new Error(`Failed to update session: ${response.status}`);
    return this.normalizeSession(await response.json());
  }

  async updateStatus(id: string, status: SessionStatus): Promise<TrainingSessionApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/sessions/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    );
    if (!response.ok) throw await this.failure(response, `Failed to update session: ${response.status}`);
    return this.normalizeSession(await response.json());
  }

  /** Session + trainer profile + participants (incl. waitlist) + reviews, for the session dialog. */
  async getOverview(id: string): Promise<SessionOverview> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/sessions/${id}/overview`);
    if (!response.ok) throw await this.failure(response, `Failed to load session: ${response.status}`);
    const raw = await response.json();
    const t = raw.trainer;
    return {
      session: this.normalizeSession(raw.session),
      trainer: t ? {
        id: t.id,
        name: t.name,
        role: t.role ?? null,
        photoUrl: t.photo_url ?? null,
        yearsAtGym: t.years_at_gym ?? null,
        rating: t.rating ?? null,
        ratingCount: t.rating_count ?? 0,
        certifications: t.certifications ?? [],
      } : null,
      participants: (raw.participants ?? []).map((p: any): SessionParticipant => ({
        bookingId: String(p.booking_id),
        memberDbId: p.member_db_id ?? null,
        memberCode: p.member_code ?? null,
        name: p.name ?? "",
        phone: p.phone ?? null,
        email: p.email ?? null,
        photoUrl: p.photo_url ?? null,
        plan: p.plan ?? null,
        membershipStatus: p.membership_status ?? null,
        guest: Boolean(p.guest),
        status: p.status ?? "confirmed",
        paymentStatus: p.payment_status ?? null,
        price: p.price ?? null,
        enrolmentId: p.enrolment_id ?? null,
        waitlistPosition: p.waitlist_position ?? null,
        checkedInAt: p.checked_in_at ?? null,
        bookedAt: p.booked_at ?? null,
      })),
      reviews: (raw.reviews ?? []).map((v: any): SessionReviewItem => ({
        id: v.id,
        memberDbId: v.member_db_id ?? null,
        memberName: v.member_name ?? null,
        memberPhotoUrl: v.member_photo_url ?? null,
        rating: Number(v.rating ?? 0),
        comment: v.comment ?? null,
        createdAt: v.created_at ?? null,
      })),
    };
  }

  /** In-app + push reminder to everyone holding a seat. Resolves to how many members it reached. */
  async sendReminder(id: string, note?: string): Promise<number> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/sessions/${id}/remind`,
      { method: "POST", body: JSON.stringify({ note: note ?? null }) }
    );
    if (!response.ok) throw await this.failure(response, `Failed to send reminder: ${response.status}`);
    const raw = await response.json();
    return Number(raw.sent ?? 0);
  }

  async deleteSession(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/sessions/${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error(`Failed to delete session: ${response.status}`);
  }
}

export const trainingService = new TrainingService();
