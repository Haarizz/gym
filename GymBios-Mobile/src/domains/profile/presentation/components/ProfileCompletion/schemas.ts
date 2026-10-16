import { z } from 'zod';
import type { ParseKeys } from 'i18next';
import { i18n } from '@/core/i18n';
import { validateDateOfBirth } from '../../../domain/dateOfBirthRules';
import { validateHeight, validateWeight } from '../../../domain/bodyMetricsRules';
import { validateEmergencyPhone } from '../../../domain/contactRules';

// Messages are resolved when validation runs, so they follow the current language.
const required = (key: ParseKeys) => ({ error: () => i18n.t(key) });

const optionalWith = (validate: (value: string) => string | null) =>
  z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      const error = value ? validate(value) : null;
      if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    });

export const personalInfoSchema = z.object({
  fullName: z.string().min(1, required('validation.fullNameRequired')),
  phone: z.string().min(1, required('validation.phoneRequired')),
  dateOfBirth: optionalWith(validateDateOfBirth),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
});

export const emergencyInfoSchema = z.object({
  emergencyContact: z.string().min(1, required('validation.emergencyContactRequired')),
  emergencyPhone: z.string().min(1, required('validation.emergencyPhoneRequired')),
});

export const healthInfoSchema = z.object({
  bloodType: z.string().optional(),
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),
  chronicIllnesses: z.string().optional(),
  height: optionalWith(validateHeight),
  weight: optionalWith(validateWeight),
});

export const profileCompletionSchema = z
  .object({
    ...personalInfoSchema.shape,
    ...emergencyInfoSchema.shape,
    ...healthInfoSchema.shape,
    photoUrl: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const error = validateEmergencyPhone(values.emergencyPhone, values.phone);
    if (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error, path: ['emergencyPhone'] });
    }
  });

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
export type EmergencyInfoValues = z.infer<typeof emergencyInfoSchema>;
export type HealthInfoValues = z.infer<typeof healthInfoSchema>;
export type ProfileCompletionValues = z.infer<typeof profileCompletionSchema>;
