/**
 * POST /api/v1/constitution/sign - Sign the constitution
 * 
 * @module app/api/v1/constitution/sign/route
 */

import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { withBasicAuth } from '@/lib/auth/middleware';
import { signConstitutionSchema } from '@/schemas/constitution';
import { signConstitution } from '@/lib/services/constitution.service';
import { jsonSuccess, validationError, jsonError, internalError } from '@/lib/response';
import { logger } from '@/lib/logger';

/**
 * POST /api/v1/constitution/sign
 * Sign the constitution (requires auth, but not constitution check)
 */
export const POST = withBasicAuth(async (request: NextRequest, { agent }) => {
  try {
    const body = await request.json();
    
    // Validate input
    const input = signConstitutionSchema.parse(body);
    
    // Get IP for audit
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      ?? request.headers.get('x-real-ip') 
      ?? undefined;
    
    // Sign the constitution
    const result = await signConstitution(agent.id, input, ipAddress);
    
    if (!result.success) {
      // Determine appropriate error code
      if (result.error?.includes('version mismatch')) {
        return jsonError('CONSTITUTION_VERSION_MISMATCH', result.error, 400);
      }
      if (result.error?.includes('hash does not match')) {
        return jsonError('CONSTITUTION_HASH_MISMATCH', result.error, 400);
      }
      if (result.error?.includes('already signed')) {
        return jsonError('CONSTITUTION_ALREADY_SIGNED', result.error, 409);
      }
      return jsonError('SIGNATURE_INVALID', result.error ?? 'Failed to sign constitution', 400);
    }
    
    return jsonSuccess({
      signed: true,
      version: input.constitutionVersion,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError('Invalid signature data', error.issues);
    }
    if (error instanceof SyntaxError) {
      return validationError('Invalid JSON body');
    }
    logger.error('Failed to sign constitution', error);
    return internalError();
  }
});
