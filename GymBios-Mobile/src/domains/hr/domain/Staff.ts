export interface StaffCertification {
  id?: string;
  certName: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  documentUrl: string;
}

export type WeeklySchedule = Record<string, string[]>;

export interface Staff {
  id: string;
  staffId: string;

  name: string;
  email: string;
  phone: string;

  role: string;
  department: string;
  branch: string;

  monthlyTarget: number;
  baseSalary: number;

  status: string;
  joinDate: string;

  address: string;
  photoUrl?: string;

  certifications: StaffCertification[];
  schedule: WeeklySchedule;

  createdAt?: string;
  updatedAt?: string;

  userId?: number;
  appUsername?: string;
  appAccessEnabled: boolean;
}

export interface StaffPage {
  content: Staff[];
  page: number;
  limit: number;
  totalElements: number;
  totalPages: number;
}