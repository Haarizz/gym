import { z } from 'zod';

export const personalInfoSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  address: z.string().min(1, 'Address is required'),
});

export const emergencyInfoSchema = z.object({
  emergencyContact: z.string().min(1, 'Emergency contact name is required'),
  emergencyPhone: z.string().min(1, 'Emergency phone is required'),
});

export const healthInfoSchema = z.object({
  bloodType: z.string().optional(),
  medicalConditions: z.string().optional(),
});

export const profileCompletionSchema = z.object({
  ...personalInfoSchema.shape,
  ...emergencyInfoSchema.shape,
  ...healthInfoSchema.shape,
});

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
export type EmergencyInfoValues = z.infer<typeof emergencyInfoSchema>;
export type HealthInfoValues = z.infer<typeof healthInfoSchema>;
export type ProfileCompletionValues = z.infer<typeof profileCompletionSchema>;
