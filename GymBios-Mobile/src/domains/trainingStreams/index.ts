export type { 
  TrainingStream, 
  TrainingStreamFilters, 
  TrainingStreamAnalytics 
} from './domain/TrainingStream';

export type { 
  TrainingStreamRepository,
  CreateTrainingStreamRequest,
  UpdateTrainingStreamRequest
} from './application/TrainingStreamRepository';

export { ApiTrainingStreamRepository } from './infrastructure/ApiTrainingStreamRepository';

export { 
  useTrainingStreams, 
  useTrainingStreamAnalytics, 
  trainingStreamKeys 
} from './hooks/useTrainingStreams';

export {
  useCreateTrainingStream,
  useUpdateTrainingStream,
  useDeleteTrainingStream,
  useStartTrainingStream,
  useEndTrainingStream,
  useJoinTrainingStream,
  useLeaveTrainingStream,
} from './hooks/useTrainingStreamActions';

// Presentation
export { TrainingStreamsHubScreen as default } from './presentation/screens/TrainingStreamsHubScreen';
export { CreateTrainingStreamScreen } from './presentation/screens/CreateTrainingStreamScreen';
export { UploadTrainingRecordingScreen } from './presentation/screens/UploadTrainingRecordingScreen';

