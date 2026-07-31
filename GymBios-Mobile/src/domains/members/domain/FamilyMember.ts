export interface FamilyMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  familyRole: string;
  membershipType: string;
  status: string;
  startDate: string;
  endDate?: string;
  isFrozen: boolean;
  photoUrl?: string;
}