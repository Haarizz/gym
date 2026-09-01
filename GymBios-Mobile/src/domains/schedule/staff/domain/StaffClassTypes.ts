export interface MobileStaffSessionRequestDTO {
  name: string;
  type: string;
  trainerId: number;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm:ss
  endTime: string;    // HH:mm:ss
  durationMinutes?: number;
  location?: string;
  capacity?: number;
  price?: number;
  status?: string;
  description?: string;
}

export interface MobileStaffSessionResponseDTO {
  id: string;
  name: string;
  type: string;
  trainerId: number;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  location: string;
  capacity: number;
  booked: number;
  price: number;
  status: string;
  description: string;
}
