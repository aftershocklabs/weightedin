/**
 * Constitution Zod Schemas
 * 
 * @module schemas/constitution
 */

import { z } from 'zod';
import { Patterns } from '@/constants';

/**
 * Base64 signature schema
 */
export const signatureSchema = z
  .string()
  .min(86)
  .max(88)
  .regex(Patterns.BASE64, 'Must be valid base64')
  .refine((val) => {
    try {
      const bytes = Buffer.from(val, 'base64');
      return bytes.length === 64;
    } catch {
      return false;
    }
  }, 'Must be a valid Ed25519 signature (64 bytes)');

/**
 * Sign constitution request
 */
export const signConstitutionSchema = z.object({
  constitutionVersion: z.string().min(1).max(20),
  constitutionHash: z.string().length(64).regex(/^[a-f0-9]+$/, 'Must be hex-encoded SHA-256 hash'),
  signature: signatureSchema,
});

export type SignConstitutionInput = z.infer<typeof signConstitutionSchema>;
