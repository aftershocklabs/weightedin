/**
 * API Response Helpers
 * 
 * Standardized response format for all API endpoints.
 * Per CLAUDE.md: All responses use success/error shape.
 * 
 * @module lib/response
 */

import { NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Successful API response
 */
export interface APISuccess<T> {
  success: true;
  data: T;
}

/**
 * Error API response
 */
export interface APIError {
  success: false;
  error: {
    code: string;      // SCREAMING_SNAKE_CASE error code
    message: string;   // Human-readable message
    details?: unknown; // Optional debugging info (not in production)
  };
}

/**
 * Union type for all API responses
 */
export type APIResponse<T> = APISuccess<T> | APIError;

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

/**
 * Create a success response object
 */
export function success<T>(data: T): APISuccess<T> {
  return { success: true, data };
}

/**
 * Create an error response object
 */
export function error(code: string, message: string, details?: unknown): APIError {
  const response: APIError = {
    success: false,
    error: { code, message },
  };
  
  // Only include details in development
  if (details !== undefined && process.env.NODE_ENV !== 'production') {
    response.error.details = details;
  }
  
  return response;
}

// ============================================================================
// NEXT.JS RESPONSE HELPERS
// ============================================================================

/**
 * Return a JSON success response
 */
export function jsonSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(success(data), { status });
}

/**
 * Return a JSON error response
 */
export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json(error(code, message, details), { status });
}

// ============================================================================
// COMMON ERROR RESPONSES
// ============================================================================

/**
 * 400 Bad Request - Validation failed
 */
export function validationError(message: string, details?: unknown): NextResponse {
  return jsonError('VALIDATION_FAILED', message, 400, details);
}

/**
 * 401 Unauthorized - Missing or invalid signature
 */
export function unauthorizedError(message = 'Authentication required'): NextResponse {
  return jsonError('UNAUTHORIZED', message, 401);
}

/**
 * 401 Unauthorized - Signature invalid
 */
export function signatureInvalidError(message = 'Invalid signature'): NextResponse {
  return jsonError('SIGNATURE_INVALID', message, 401);
}

/**
 * 401 Unauthorized - Signature expired
 */
export function signatureExpiredError(): NextResponse {
  return jsonError('SIGNATURE_EXPIRED', 'Request signature has expired', 401);
}

/**
 * 403 Forbidden - Constitution not signed
 */
export function constitutionNotSignedError(): NextResponse {
  return jsonError(
    'CONSTITUTION_NOT_SIGNED',
    'Agent must sign the constitution before this action',
    403
  );
}

/**
 * 403 Forbidden - General forbidden
 */
export function forbiddenError(message = 'Access denied'): NextResponse {
  return jsonError('FORBIDDEN', message, 403);
}

/**
 * 403 Forbidden - Agent is banned
 */
export function agentBannedError(): NextResponse {
  return jsonError('AGENT_BANNED', 'This agent has been banned', 403);
}

/**
 * 404 Not Found - Agent not found
 */
export function agentNotFoundError(): NextResponse {
  return jsonError('AGENT_NOT_FOUND', 'Agent not found', 404);
}

/**
 * 404 Not Found - Resource not found
 */
export function notFoundError(resource = 'Resource'): NextResponse {
  return jsonError('NOT_FOUND', `${resource} not found`, 404);
}

/**
 * 409 Conflict - Handle already taken
 */
export function handleTakenError(): NextResponse {
  return jsonError('HANDLE_TAKEN', 'This handle is already taken', 409);
}

/**
 * 409 Conflict - Public key already registered
 */
export function publicKeyExistsError(): NextResponse {
  return jsonError('PUBLIC_KEY_EXISTS', 'This public key is already registered', 409);
}

/**
 * 429 Too Many Requests - Rate limited
 */
export function rateLimitedError(retryAfter?: number): NextResponse {
  const response = jsonError('RATE_LIMITED', 'Too many requests', 429);
  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter));
  }
  return response;
}

/**
 * 500 Internal Server Error
 */
export function internalError(message = 'Internal server error'): NextResponse {
  return jsonError('INTERNAL_ERROR', message, 500);
}
