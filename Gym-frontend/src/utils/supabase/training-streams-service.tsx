import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface TrainingStreamApi {
  id: string;
  title: string;
  instructor_id: number | null;
  instructor_name: string | null;
  category: string;
  duration: number;
  difficulty: string;
  max_participants: number;
  participants: number;
  status: string; // Scheduled | Live | Ended | Cancelled
  scheduled_time: string | null;
  views: number;
  likes: number;
  description: string | null;
  stream_url: string | null;
  stream_type: string; // live | recording | hybrid
  thumbnail_url: string | null;
}

export interface TrainingStreamRequest {
  title: string;
  instructor_id?: number | null;
  category: string;
  duration: number;
  difficulty?: string;
  max_participants?: number;
  status?: string;
  scheduled_time?: string | null;
  description?: string;
  stream_url?: string;
  stream_type?: string;
  thumbnail_url?: string;
}

export interface TrainingStreamAnalytics {
  live_count: number;
  scheduled_count: number;
  active_viewers: number;
  avg_views: number;
  total_streams: number;
  total_views: number;
  engagement_rate: number;
  category_stats: { category: string; count: number }[];
}

class TrainingStreamsService {

  async getStreams(params?: { status?: string; category?: string; search?: string }): Promise<TrainingStreamApi[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/training-streams?${query.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch streams: ${response.status}`);
    return response.json();
  }

  async createStream(payload: TrainingStreamRequest): Promise<TrainingStreamApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/training-streams`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    if (!response.ok) throw new Error(`Failed to create stream: ${response.status}`);
    return response.json();
  }

  async updateStream(id: string, payload: Partial<TrainingStreamRequest>): Promise<TrainingStreamApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/training-streams/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
    if (!response.ok) throw new Error(`Failed to update stream: ${response.status}`);
    return response.json();
  }

  async deleteStream(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/training-streams/${id}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error(`Failed to delete stream: ${response.status}`);
  }

  async startStream(id: string): Promise<TrainingStreamApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/training-streams/${id}/start`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(`Failed to start stream: ${response.status}`);
    return response.json();
  }

  async endStream(id: string): Promise<TrainingStreamApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/training-streams/${id}/end`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(`Failed to end stream: ${response.status}`);
    return response.json();
  }

  async getAnalytics(): Promise<TrainingStreamAnalytics> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/training-streams/analytics`
    );
    if (!response.ok) throw new Error(`Failed to fetch analytics: ${response.status}`);
    return response.json();
  }
}

export const trainingStreamsService = new TrainingStreamsService();
