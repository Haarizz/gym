import type { 
  TrainingStream, 
  TrainingStreamFilters, 
  TrainingStreamAnalytics 
} from '../domain/TrainingStream';

export interface CreateTrainingStreamRequest {
  title?: string;
  instructorId?: number;
  category?: string;
  duration?: number;
  difficulty?: string;
  maxParticipants?: number;
  status?: string;
  scheduledTime?: string;
  description?: string;
  streamUrl?: string;
  streamType?: string;
  thumbnailUrl?: string;
}

export type UpdateTrainingStreamRequest = CreateTrainingStreamRequest;

export interface TrainingStreamRepository {
  getStreams(filters?: TrainingStreamFilters): Promise<TrainingStream[]>;
  createStream(request: CreateTrainingStreamRequest): Promise<TrainingStream>;
  updateStream(id: number, request: UpdateTrainingStreamRequest): Promise<TrainingStream>;
  deleteStream(id: number): Promise<void>;
  startStream(id: number): Promise<TrainingStream>;
  endStream(id: number): Promise<TrainingStream>;
  joinStream(id: number): Promise<TrainingStream>;
  leaveStream(id: number): Promise<TrainingStream>;
  getAnalytics(): Promise<TrainingStreamAnalytics>;
}
