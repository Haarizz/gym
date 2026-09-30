export interface ProfileApiModel {
  fullName: string;
  /** Account email (read-only; not accepted on update). */
  email?: string;
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
  allergies?: string;
  currentMedications?: string;
  chronicIllnesses?: string;
  height?: string;
  weight?: string;
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
  allergies?: string;
  currentMedications?: string;
  chronicIllnesses?: string;
  height?: string;
  weight?: string;
}
