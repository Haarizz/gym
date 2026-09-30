import { z } from 'zod';
import { validateDateOfBirth } from '../../../domain/dateOfBirthRules';

export const personalInfoSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  dateOfBirth: z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      const error = value ? validateDateOfBirth(value) : null;
      if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
});

export const emergencyInfoSchema = z.object({
  emergencyContact: z.string().min(1, 'Emergency contact name is required'),
  emergencyPhone: z.string().min(1, 'Emergency phone is required'),
});

export const healthInfoSchema = z.object({
  bloodType: z.string().optional(),
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),
  chronicIllnesses: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
});

export const profileCompletionSchema = z.object({
  ...personalInfoSchema.shape,
  ...emergencyInfoSchema.shape,
  ...healthInfoSchema.shape,
  photoUrl: z.string().optional(),
});

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
export type EmergencyInfoValues = z.infer<typeof emergencyInfoSchema>;
export type HealthInfoValues = z.infer<typeof healthInfoSchema>;
export type ProfileCompletionValues = z.infer<typeof profileCompletionSchema>;
