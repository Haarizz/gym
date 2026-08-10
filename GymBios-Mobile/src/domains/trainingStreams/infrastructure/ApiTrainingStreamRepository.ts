import type { 
  TrainingStreamRepository,
  CreateTrainingStreamRequest,
  UpdateTrainingStreamRequest
} from '../application/TrainingStreamRepository';
import type { 
  TrainingStream, 
  TrainingStreamFilters, 
  TrainingStreamAnalytics 
} from '../domain/TrainingStream';
import { apiClient } from '@/core/network/apiClient';

interface TrainingStreamResponse {
  id: string;
  title: string;
  instructor_id?: number;
  instructor_name?: string;
  category?: string;
  duration?: number;
  difficulty?: string;
  max_participants?: number;
  participants?: number;
  status?: string;
  scheduled_time?: string;
  views?: number;
  likes?: number;
  description?: string;
  stream_url?: string;
  stream_type?: string;
  thumbnail_url?: string;
}

interface TrainingStreamAnalyticsResponse {
  live_count: number;
  scheduled_count: number;
  active_viewers: number;
  avg_views: number;
  total_streams: number;
  total_views: number;
  engagement_rate: number;
  category_stats: Record<string, any>[];
}

export class ApiTrainingStreamRepository implements TrainingStreamRepository {
  async getStreams(filters?: TrainingStreamFilters): Promise<TrainingStream[]> {
    const response = await apiClient.get<TrainingStreamResponse[]>('/training-streams', {
      params: filters,
    });
    return response.data.map((item) => this.toDomain(item));
  }

  async createStream(request: CreateTrainingStreamRequest): Promise<TrainingStream> {
    const response = await apiClient.post<TrainingStreamResponse>('/training-streams', this.toRequest(request));
    return this.toDomain(response.data);
  }

  async updateStream(id: number, request: UpdateTrainingStreamRequest): Promise<TrainingStream> {
    const response = await apiClient.put<TrainingStreamResponse>(`/training-streams/${id}`, this.toRequest(request));
    return this.toDomain(response.data);
  }

  async deleteStream(id: number): Promise<void> {
    await apiClient.delete(`/training-streams/${id}`);
  }

  async startStream(id: number): Promise<TrainingStream> {
    const response = await apiClient.post<TrainingStreamResponse>(`/training-streams/${id}/start`);
    return this.toDomain(response.data);
  }

  async endStream(id: number): Promise<TrainingStream> {
    const response = await apiClient.post<TrainingStreamResponse>(`/training-streams/${id}/end`);
    return this.toDomain(response.data);
  }

  async joinStream(id: number): Promise<TrainingStream> {
    const response = await apiClient.post<TrainingStreamResponse>(`/training-streams/${id}/join`);
    return this.toDomain(response.data);
  }

  async leaveStream(id: number): Promise<TrainingStream> {
    const response = await apiClient.post<TrainingStreamResponse>(`/training-streams/${id}/leave`);
    return this.toDomain(response.data);
  }

  async getAnalytics(): Promise<TrainingStreamAnalytics> {
    const response = await apiClient.get<TrainingStreamAnalyticsResponse>('/training-streams/analytics');
    return this.toAnalyticsDomain(response.data);
  }

  private toRequest(request: CreateTrainingStreamRequest | UpdateTrainingStreamRequest) {
    return {
      title: request.title,
      instructor_id: request.instructorId,
      category: request.category,
      duration: request.duration,
      difficulty: request.difficulty,
      max_participants: request.maxParticipants,
      status: request.status,
      scheduled_time: request.scheduledTime,
      description: request.description,
      stream_url: request.streamUrl,
      stream_type: request.streamType,
      thumbnail_url: request.thumbnailUrl,
    };
  }

  private toDomain(response: TrainingStreamResponse): TrainingStream {
    return {
      id: response.id,
      title: response.title,
      instructorId: response.instructor_id,
      instructorName: response.instructor_name,
      category: response.category,
      duration: response.duration,
      difficulty: response.difficulty,
      maxParticipants: response.max_participants,
      participants: response.participants,
      status: response.status,
      scheduledTime: response.scheduled_time,
      views: response.views,
      likes: response.likes,
      description: response.description,
      streamUrl: response.stream_url,
      streamType: response.stream_type,
      thumbnailUrl: response.thumbnail_url,
    };
  }

  private toAnalyticsDomain(response: TrainingStreamAnalyticsResponse): TrainingStreamAnalytics {
    return {
      liveCount: response.live_count,
      scheduledCount: response.scheduled_count,
      activeViewers: response.active_viewers,
      avgViews: response.avg_views,
      totalStreams: response.total_streams,
      totalViews: response.total_views,
      engagementRate: response.engagement_rate,
      categoryStats: response.category_stats,
    };
  }
}
