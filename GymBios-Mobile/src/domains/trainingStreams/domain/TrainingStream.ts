export interface TrainingStream {
  id: string;
  title: string;
  instructorId?: number;
  instructorName?: string;
  category?: string;
  duration?: number;
  difficulty?: string;
  maxParticipants?: number;
  participants?: number;
  status?: string;
  scheduledTime?: string;
  views?: number;
  likes?: number;
  description?: string;
  streamUrl?: string;
  streamType?: string;
  thumbnailUrl?: string;
}

export interface TrainingStreamFilters {
  status?: string;
  category?: string;
  search?: string;
}

export interface TrainingStreamAnalytics {
  liveCount: number;
  scheduledCount: number;
  activeViewers: number;
  avgViews: number;
  totalStreams: number;
  totalViews: number;
  engagementRate: number;
  categoryStats: Record<string, any>[];
}
