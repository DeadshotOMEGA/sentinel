import { z } from 'zod';

/**
 * HIGH-2 FIX: Strong password policy enforcement
 *
 * Requirements:
 * - Minimum 12 characters
 * - Maximum 128 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 * - Not a common password
 */

const COMMON_PASSWORDS = [
  'password',
  'password123',
  'password1234',
  '123456',
  '12345678',
  '123456789',
  'qwerty',
  'qwerty123',
  'admin',
  'admin123',
  'letmein',
  'welcome',
  'welcome123',
  'sentinel',
  'sentinel123',
  'chippawa',
  'chippawa123',
  'Password1!',
  'Password123!',
  'Admin123!',
];

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be less than 128 characters')
  .refine((pwd) => /[a-z]/.test(pwd), 'Password must contain at least one lowercase letter')
  .refine((pwd) => /[A-Z]/.test(pwd), 'Password must contain at least one uppercase letter')
  .refine((pwd) => /[0-9]/.test(pwd), 'Password must contain at least one number')
  .refine(
    (pwd) => /[^a-zA-Z0-9]/.test(pwd),
    'Password must contain at least one special character'
  )
  .refine(
    (pwd) => !COMMON_PASSWORDS.includes(pwd.toLowerCase()),
    'This password is too common. Please choose a stronger password.'
  );

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a password against the password policy
 * Returns validation result with all error messages
 */
export function validatePassword(password: string): PasswordValidationResult {
  const result = passwordSchema.safeParse(password);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => e.message),
  };
}
