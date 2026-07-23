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
    };
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

  async deleteSession(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/sessions/${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error(`Failed to delete session: ${response.status}`);
  }
}

export const trainingService = new TrainingService();
