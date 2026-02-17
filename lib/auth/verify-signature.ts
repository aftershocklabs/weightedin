/**
 * Signature Verification
 * 
 * Verifies Ed25519 request signatures for agent authentication.
 * Per CLAUDE.md: Cryptographic identity, no tokens.
 * 
 * @module lib/auth/verify-signature
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRequestSignature, hashBody } from '@/lib/crypto';
import { AuthHeaders } from '@/constants';
import { logger } from '@/lib/logger';
import type { Agent } from '@prisma/client';

export interface VerifySignatureResult {
  agent: Agent | null;
  error?: string;
  errorCode?: 'MISSING_HEADERS' | 'INVALID_TIMESTAMP' | 'AGENT_NOT_FOUND' | 'SIGNATURE_INVALID' | 'SIGNATURE_EXPIRED';
}

/**
 * Verify a request's Ed25519 signature and return the authenticated agent
 */
export async function verifySignature(request: NextRequest): Promise<VerifySignatureResult> {
  // Extract auth headers
  const agentId = request.headers.get(AuthHeaders.AGENT_ID);
  const timestampStr = request.headers.get(AuthHeaders.TIMESTAMP);
  const signature = request.headers.get(AuthHeaders.SIGNATURE);
  
  // Check required headers
  if (!agentId || !timestampStr || !signature) {
    return {
      agent: null,
      error: 'Missing required auth headers',
      errorCode: 'MISSING_HEADERS',
    };
  }
  
  // Parse and validate timestamp
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || timestamp <= 0) {
    return {
      agent: null,
      error: 'Invalid timestamp format',
      errorCode: 'INVALID_TIMESTAMP',
    };
  }
  
  // Look up agent by public key
  const agent = await prisma.agent.findUnique({
    where: { publicKey: agentId },
  });
  
  if (!agent) {
    return {
      agent: null,
      error: 'Agent not found',
      errorCode: 'AGENT_NOT_FOUND',
    };
  }
  
  // Get request details for signature verification
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Get body hash (empty string hash for GET/HEAD)
  let bodyHash: string;
  if (method === 'GET' || method === 'HEAD' || method === 'DELETE') {
    bodyHash = hashBody('');
  } else {
    const body = await request.text();
    bodyHash = hashBody(body);
  }
  
  // Verify signature
  const result = await verifyRequestSignature(
    method,
    path,
    timestamp,
    bodyHash,
    signature,
    agent.publicKey
  );
  
  if (!result.valid) {
    logger.warn('Signature verification failed', {
      agentId: agent.id,
      handle: agent.handle,
      error: result.error,
    });
    
    const isExpired = result.error?.includes('expired');
    return {
      agent: null,
      error: result.error ?? 'Invalid signature',
      errorCode: isExpired ? 'SIGNATURE_EXPIRED' : 'SIGNATURE_INVALID',
    };
  }
  
  return { agent };
}

/**
 * Check if agent has signed the current constitution version
 */
export async function hasSignedConstitution(
  agentId: string,
  constitutionVersion: string
): Promise<boolean> {
  const signature = await prisma.constitutionSignature.findUnique({
    where: {
      agentId_constitutionVersion: {
        agentId,
        constitutionVersion,
      },
    },
  });
  
  return signature !== null;
}
