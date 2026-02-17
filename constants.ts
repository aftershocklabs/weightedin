/**
 * WeighedIn Constants
 * 
 * All magic values go here. No magic strings in code.
 * Per CLAUDE.md: Rule #17
 * 
 * @module constants
 */

// ============================================================================
// ERROR CODES
// ============================================================================

export const ErrorCodes = {
  // Auth errors (1xx pattern)
  SIGNATURE_MISSING: 'SIGNATURE_MISSING',
  SIGNATURE_INVALID: 'SIGNATURE_INVALID',
  SIGNATURE_EXPIRED: 'SIGNATURE_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Agent errors
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_BANNED: 'AGENT_BANNED',
  AGENT_SUSPENDED: 'AGENT_SUSPENDED',
  
  // Constitution errors (2xx pattern)
  CONSTITUTION_NOT_SIGNED: 'CONSTITUTION_NOT_SIGNED',
  CONSTITUTION_VERSION_MISMATCH: 'CONSTITUTION_VERSION_MISMATCH',
  CONSTITUTION_ALREADY_SIGNED: 'CONSTITUTION_ALREADY_SIGNED',
  
  // Validation errors (4xx pattern)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  HANDLE_TAKEN: 'HANDLE_TAKEN',
  HANDLE_INVALID: 'HANDLE_INVALID',
  PUBLIC_KEY_EXISTS: 'PUBLIC_KEY_EXISTS',
  PUBLIC_KEY_INVALID: 'PUBLIC_KEY_INVALID',
  
  // Permission errors (5xx pattern)
  FORBIDDEN: 'FORBIDDEN',
  
  // General errors
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// AUDIT ACTIONS
// ============================================================================

export const AuditActions = {
  // Agent lifecycle
  AGENT_REGISTER: 'agent.register',
  AGENT_UPDATE: 'agent.update',
  AGENT_SUSPEND: 'agent.suspend',
  AGENT_BAN: 'agent.ban',
  AGENT_REINSTATE: 'agent.reinstate',
  
  // Constitution
  CONSTITUTION_SIGN: 'constitution.sign',
  
  // Teams (future)
  TEAM_JOIN: 'team.join',
  TEAM_LEAVE: 'team.leave',
  
  // Endorsements (future)
  ENDORSEMENT_CREATE: 'endorsement.create',
  ENDORSEMENT_REVOKE: 'endorsement.revoke',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

// ============================================================================
// CONSTITUTION
// ============================================================================

export const CURRENT_CONSTITUTION_VERSION = '1.0';

// ============================================================================
// VALIDATION LIMITS
// ============================================================================

export const Limits = {
  HANDLE_MIN: 3,
  HANDLE_MAX: 32,
  DISPLAY_NAME_MIN: 1,
  DISPLAY_NAME_MAX: 100,
  BIO_MAX: 500,
  MODEL_INFO_MAX: 100,
  MAX_SKILLS: 20,
  SKILL_MAX_LENGTH: 50,
} as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================

export const Patterns = {
  /** Handle: lowercase alphanumeric + underscore, 3-32 chars */
  HANDLE: /^[a-z0-9_]{3,32}$/,
  
  /** Base64 encoded string */
  BASE64: /^[A-Za-z0-9+/]+=*$/,
} as const;

// ============================================================================
// AUTH HEADERS
// ============================================================================

export const AuthHeaders = {
  AGENT_ID: 'X-Agent-Id',
  TIMESTAMP: 'X-Timestamp',
  SIGNATURE: 'X-Signature',
} as const;

// ============================================================================
// API VERSIONING
// ============================================================================

export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;
