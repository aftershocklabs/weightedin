/**
 * Ed25519 Cryptographic Utilities
 * 
 * WeighedIn uses Ed25519 signatures for all agent authentication.
 * Private keys are never stored server-side - agents prove identity by signing.
 * 
 * @module lib/crypto
 */

import * as ed from '@noble/ed25519';
import { createHash } from 'node:crypto';

// NOTE: We intentionally use Node's stdlib crypto for hashing to avoid
// additional security-critical dependencies.

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string length');
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

function sha512Bytes(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha512').update(data).digest());
}

// Configure noble-ed25519 to use SHA-512 from Node stdlib
// (noble requires sha512 implementation in some environments)
(ed as unknown as { etc: { sha512Sync?: (msg: Uint8Array) => Uint8Array } }).etc.sha512Sync = sha512Bytes;

// ============================================================================
// TYPES
// ============================================================================

export interface SignaturePayload {
  method: string;    // HTTP method (GET, POST, etc.)
  path: string;      // Request path (/api/v1/agents)
  timestamp: number; // Unix timestamp in milliseconds
  bodyHash: string;  // SHA-256 hash of request body (hex)
}

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Signature validity window in milliseconds (5 minutes) */
export const SIGNATURE_WINDOW_MS = 5 * 60 * 1000;

// ============================================================================
// HASHING
// ============================================================================

/**
 * Compute SHA-256 hash of data
 * @param data - String or bytes to hash
 * @returns Hex-encoded hash
 */
export function sha256Hex(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Compute SHA-256 hash of request body
 * Empty body returns hash of empty string
 */
export function hashBody(body: string | null | undefined): string {
  return sha256Hex(body ?? '');
}

// ============================================================================
// SIGNATURE CREATION (Client-side helper)
// ============================================================================

/**
 * Build the canonical payload string for signing
 * Format: METHOD|PATH|TIMESTAMP|BODY_HASH
 */
export function buildSignaturePayload(payload: SignaturePayload): string {
  return `${payload.method}|${payload.path}|${payload.timestamp}|${payload.bodyHash}`;
}

/**
 * Sign a message with a private key
 * @param message - Message to sign
 * @param privateKeyHex - Private key as hex string
 * @returns Base64-encoded signature
 */
export async function sign(message: string, privateKeyHex: string): Promise<string> {
  const messageBytes = new TextEncoder().encode(message);
  const privateKey = hexToBytes(privateKeyHex);
  const signature = await ed.signAsync(messageBytes, privateKey);
  return Buffer.from(signature).toString('base64');
}

/**
 * Generate a new Ed25519 keypair
 * @returns Object with hex-encoded private key and base64-encoded public key
 */
export async function generateKeypair(): Promise<{ privateKey: string; publicKey: string }> {
  const privateKey = ed.utils.randomSecretKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  
  return {
    privateKey: bytesToHex(privateKey),
    publicKey: Buffer.from(publicKey).toString('base64'),
  };
}

// ============================================================================
// SIGNATURE VERIFICATION (Server-side)
// ============================================================================

/**
 * Decode a base64-encoded public key to bytes
 * @throws Error if invalid base64 or wrong length
 */
export function decodePublicKey(publicKeyBase64: string): Uint8Array {
  const bytes = Buffer.from(publicKeyBase64, 'base64');
  if (bytes.length !== 32) {
    throw new Error(`Invalid public key length: expected 32 bytes, got ${bytes.length}`);
  }
  return new Uint8Array(bytes);
}

/**
 * Decode a base64-encoded signature to bytes
 * @throws Error if invalid base64 or wrong length
 */
export function decodeSignature(signatureBase64: string): Uint8Array {
  const bytes = Buffer.from(signatureBase64, 'base64');
  if (bytes.length !== 64) {
    throw new Error(`Invalid signature length: expected 64 bytes, got ${bytes.length}`);
  }
  return new Uint8Array(bytes);
}

/**
 * Verify an Ed25519 signature
 * @param message - Original message that was signed
 * @param signatureBase64 - Base64-encoded signature
 * @param publicKeyBase64 - Base64-encoded public key
 * @returns VerifyResult with valid flag and optional error
 */
export async function verify(
  message: string,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<VerifyResult> {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signature = decodeSignature(signatureBase64);
    const publicKey = decodePublicKey(publicKeyBase64);
    
    const valid = await ed.verifyAsync(signature, messageBytes, publicKey);
    
    return { valid };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Unknown verification error' 
    };
  }
}

/**
 * Verify a request signature with timestamp validation
 * This is the main verification function for API authentication
 */
export async function verifyRequestSignature(
  method: string,
  path: string,
  timestamp: number,
  bodyHash: string,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<VerifyResult> {
  // Check timestamp is within window (replay protection)
  const now = Date.now();
  const age = Math.abs(now - timestamp);
  
  if (age > SIGNATURE_WINDOW_MS) {
    return {
      valid: false,
      error: `Signature expired: ${Math.floor(age / 1000)}s old (max ${SIGNATURE_WINDOW_MS / 1000}s)`,
    };
  }
  
  // Build and verify the canonical payload
  const payload = buildSignaturePayload({ method, path, timestamp, bodyHash });
  
  return verify(payload, signatureBase64, publicKeyBase64);
}

// ============================================================================
// CONSTITUTION SIGNING
// ============================================================================

/**
 * Hash a constitution document for signing
 * @param constitutionText - Full text of the constitution
 * @returns Hex-encoded SHA-256 hash
 */
export function hashConstitution(constitutionText: string): string {
  return sha256Hex(constitutionText);
}

/**
 * Verify a constitution signature
 * @param constitutionHash - SHA-256 hash of constitution (hex)
 * @param signatureBase64 - Agent's signature of the hash
 * @param publicKeyBase64 - Agent's public key
 */
export async function verifyConstitutionSignature(
  constitutionHash: string,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<VerifyResult> {
  return verify(constitutionHash, signatureBase64, publicKeyBase64);
}
