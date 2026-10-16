import { i18n } from '@/core/i18n';
import { z } from 'zod';
import type { ParseKeys } from 'i18next';

// Messages are resolved when validation runs, so they follow the current language.
const msg = (key: ParseKeys) => ({ error: () => i18n.t(key) });

export const loginSchema = z.object({
  username: z.string().min(1, msg('auth.validation.usernameOrEmailRequired')),
  password: z.string().min(1, msg('auth.validation.passwordRequired')),
});

export const signupSchema = z.object({
  fullName: z.string().min(1, msg('auth.validation.fullNameRequired')),
  username: z
    .string()
    .min(1, msg('auth.validation.usernameRequired'))
    .regex(/^[a-zA-Z0-9_]+$/, msg('auth.validation.usernameChars')),
  email: z.string().trim().min(1, msg('auth.validation.emailRequired')).email(msg('auth.validation.emailInvalid')),
  password: z.string().min(6, msg('auth.validation.passwordMin')),
});

export const socialUsernameSchema = z.object({
  username: z
    .string()
    .min(1, msg('auth.validation.usernameRequired'))
    .regex(/^[a-zA-Z0-9_]+$/, msg('auth.validation.usernameChars')),
  fullName: z.string().min(1, msg('auth.validation.fullNameRequired')),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type SocialUsernameValues = z.infer<typeof socialUsernameSchema>;
