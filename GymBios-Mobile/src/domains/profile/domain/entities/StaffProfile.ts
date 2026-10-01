export interface StaffCertification {
  id?: string;
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  /** Relative or absolute URL of the uploaded certificate file (PDF / image). */
  documentUrl?: string;
}

/** The employee record an admin maintains on the web Staffs & Trainers page. */
export interface StaffProfile {
  staffId?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role?: string;
  department?: string;
  branch?: string;
  status?: string;
  joinDate?: string;
  monthlyTarget?: number;
  baseSalary?: number;
  appUsername?: string;
  certifications: StaffCertification[];
  /** Day name (e.g. "Monday") → shift slots, as configured by the admin. */
  schedule: Record<string, string[]>;
}
