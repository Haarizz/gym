export interface ProfileApiModel {
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodType?: string;
  medicalConditions?: string;
  photoUrl?: string;
}

export interface UpdateProfileRequestApiModel {
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodType?: string;
  medicalConditions?: string;
  photoUrl?: string;
}
