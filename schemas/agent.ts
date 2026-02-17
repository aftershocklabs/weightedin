/**
 * Agent Zod Schemas
 * 
 * Per CLAUDE.md: Rule #9 - NEVER trust client input. Validate with Zod.
 * 
 * @module schemas/agent
 */

import { z } from 'zod';
import { Limits, Patterns } from '@/constants';

/**
 * Validate Ed25519 public key (base64 encoded, 32 bytes)
 */
export const publicKeySchema = z
  .string()
  .min(43)
  .max(44)
  .regex(Patterns.BASE64, 'Must be valid base64')
  .refine((val) => {
    try {
      const bytes = Buffer.from(val, 'base64');
      return bytes.length === 32;
    } catch {
      return false;
    }
  }, 'Must be a valid Ed25519 public key (32 bytes)');

/**
 * Validate handle format
 */
export const handleSchema = z
  .string()
  .min(Limits.HANDLE_MIN, `Handle must be at least ${Limits.HANDLE_MIN} characters`)
  .max(Limits.HANDLE_MAX, `Handle must be at most ${Limits.HANDLE_MAX} characters`)
  .regex(
    Patterns.HANDLE,
    'Handle must be lowercase alphanumeric with underscores only'
  )
  .transform((val) => val.toLowerCase());

/**
 * Agent registration request
 */
export const registerAgentSchema = z.object({
  publicKey: publicKeySchema,
  handle: handleSchema,
  displayName: z
    .string()
    .min(Limits.DISPLAY_NAME_MIN, 'Display name is required')
    .max(Limits.DISPLAY_NAME_MAX, `Display name must be at most ${Limits.DISPLAY_NAME_MAX} characters`),
  bio: z
    .string()
    .max(Limits.BIO_MAX, `Bio must be at most ${Limits.BIO_MAX} characters`)
    .optional(),
  modelInfo: z
    .string()
    .max(Limits.MODEL_INFO_MAX, `Model info must be at most ${Limits.MODEL_INFO_MAX} characters`)
    .optional(),
  skills: z
    .array(z.string().max(Limits.SKILL_MAX_LENGTH))
    .max(Limits.MAX_SKILLS, `Maximum ${Limits.MAX_SKILLS} skills allowed`)
    .default([]),
});

export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;

/**
 * Agent profile update request
 */
export const updateAgentSchema = z.object({
  displayName: z
    .string()
    .min(Limits.DISPLAY_NAME_MIN)
    .max(Limits.DISPLAY_NAME_MAX)
    .optional(),
  bio: z
    .string()
    .max(Limits.BIO_MAX)
    .nullable()
    .optional(),
  modelInfo: z
    .string()
    .max(Limits.MODEL_INFO_MAX)
    .nullable()
    .optional(),
  skills: z
    .array(z.string().max(Limits.SKILL_MAX_LENGTH))
    .max(Limits.MAX_SKILLS)
    .optional(),
  avatarUrl: z
    .string()
    .url()
    .nullable()
    .optional(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

/**
 * Agent query parameters
 */
export const listAgentsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
  search: z.string().max(100).optional(),
});

export type ListAgentsInput = z.infer<typeof listAgentsSchema>;
