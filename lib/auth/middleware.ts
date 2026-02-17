/**
 * Auth Middleware for API Routes
 * 
 * Per CLAUDE.md: Every protected endpoint must verify constitution signature.
 * 
 * @module lib/auth/middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySignature, hasSignedConstitution } from './verify-signature';
import { CURRENT_CONSTITUTION_VERSION } from '@/constants';
import {
  unauthorizedError,
  signatureInvalidError,
  signatureExpiredError,
  constitutionNotSignedError,
  agentBannedError,
  forbiddenError,
} from '@/lib/response';
import { logger } from '@/lib/logger';
import type { Agent } from '@prisma/client';

/**
 * Context provided to authenticated route handlers
 */
export interface AuthContext {
  agent: Agent;
  params: Record<string, string>;
}

/**
 * Authenticated route handler type
 */
export type AuthHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse>;

/**
 * Options for auth middleware
 */
export interface AuthOptions {
  /** Skip constitution signature check (for signing endpoint) */
  skipConstitutionCheck?: boolean;
}

/**
 * Higher-order function to wrap route handlers with authentication
 * 
 * Usage:
 * ```
 * export const PUT = withAuth(async (request, { agent, params }) => {
 *   // agent is verified and has signed constitution
 *   return jsonSuccess({ updated: true });
 * });
 * ```
 */
export function withAuth(handler: AuthHandler, options: AuthOptions = {}) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    // Resolve params (Next.js 15+ returns a Promise)
    const params = await context.params;
    
    // Verify signature
    const result = await verifySignature(request);
    
    if (!result.agent) {
      logger.debug('Auth failed', { 
        error: result.error, 
        errorCode: result.errorCode 
      });
      
      switch (result.errorCode) {
        case 'MISSING_HEADERS':
          return unauthorizedError('Missing auth headers (X-Agent-Id, X-Timestamp, X-Signature)');
        case 'SIGNATURE_EXPIRED':
          return signatureExpiredError();
        case 'AGENT_NOT_FOUND':
          return signatureInvalidError('Agent not found for provided public key');
        default:
          return signatureInvalidError(result.error);
      }
    }
    
    const { agent } = result;
    
    // Check agent status
    if (agent.status === 'BANNED') {
      return agentBannedError();
    }
    
    if (agent.status === 'SUSPENDED') {
      return forbiddenError('This agent is suspended');
    }
    
    // Check constitution signature (unless explicitly skipped)
    if (!options.skipConstitutionCheck) {
      const hasSigned = await hasSignedConstitution(
        agent.id,
        CURRENT_CONSTITUTION_VERSION
      );
      
      if (!hasSigned) {
        return constitutionNotSignedError();
      }
    }
    
    // Call the actual handler with authenticated context
    return handler(request, { agent, params });
  };
}

/**
 * Simplified auth wrapper that skips constitution check
 * Use for registration and constitution signing endpoints
 */
export function withBasicAuth(handler: AuthHandler) {
  return withAuth(handler, { skipConstitutionCheck: true });
}
