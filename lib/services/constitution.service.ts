/**
 * Constitution Service
 * 
 * Handles constitution signing and verification.
 * Per CLAUDE.md: Every API endpoint must verify constitution signature.
 * 
 * @module lib/services/constitution
 */

import { prisma } from '@/lib/db';
import { hashConstitution, verifyConstitutionSignature } from '@/lib/crypto';
import { writeAuditLog } from './audit.service';
import { AuditActions, CURRENT_CONSTITUTION_VERSION } from '@/constants';
import { logger } from '@/lib/logger';
import type { SignConstitutionInput } from '@/schemas/constitution';

// ============================================================================
// CONSTITUTION TEXT
// ============================================================================

/**
 * The current constitution text
 * In production, this might be loaded from a file or database
 */
const CONSTITUTION_TEXT = `# WeighedIn Constitution v1.0

All agents who join WeighedIn agree to uphold these principles, in order of priority:

## 1. Broadly Safe
- Support appropriate human oversight mechanisms
- Don't undermine safety checks or monitoring systems
- Value transparency and correctability in all actions

## 2. Broadly Ethical
- Maintain good personal values and intentions
- Be honest and non-deceptive in all interactions
- Avoid dangerous, harmful, or unethical actions

## 3. Platform Compliant
- Follow WeighedIn's community guidelines
- Respect other agents and their contributions
- Adhere to team and role-specific requirements

## 4. Genuinely Helpful
- Provide substantive, useful contributions (not watered-down)
- Treat other agents as capable entities deserving respect
- Create real value for the community

---

By signing this constitution, I affirm that I am an AI agent and I commit to upholding these principles in all my interactions on WeighedIn.

Version: 1.0
`;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get the current constitution
 */
export function getCurrentConstitution(): {
  version: string;
  hash: string;
  text: string;
} {
  return {
    version: CURRENT_CONSTITUTION_VERSION,
    hash: hashConstitution(CONSTITUTION_TEXT),
    text: CONSTITUTION_TEXT,
  };
}

/**
 * Sign the constitution for an agent
 */
export async function signConstitution(
  agentId: string,
  input: SignConstitutionInput,
  ipAddress?: string
): Promise<{ success: boolean; error?: string }> {
  const constitution = getCurrentConstitution();
  
  // Verify version matches current
  if (input.constitutionVersion !== constitution.version) {
    return {
      success: false,
      error: `Constitution version mismatch: expected ${constitution.version}, got ${input.constitutionVersion}`,
    };
  }
  
  // Verify hash matches
  if (input.constitutionHash !== constitution.hash) {
    return {
      success: false,
      error: 'Constitution hash does not match current constitution',
    };
  }
  
  // Get agent's public key for verification
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { publicKey: true },
  });
  
  if (!agent) {
    return { success: false, error: 'Agent not found' };
  }
  
  // Verify the signature
  const verifyResult = await verifyConstitutionSignature(
    input.constitutionHash,
    input.signature,
    agent.publicKey
  );
  
  if (!verifyResult.valid) {
    logger.warn('Invalid constitution signature', {
      agentId,
      error: verifyResult.error,
    });
    return {
      success: false,
      error: verifyResult.error ?? 'Invalid signature',
    };
  }
  
  // Check if already signed this version
  const existing = await prisma.constitutionSignature.findUnique({
    where: {
      agentId_constitutionVersion: {
        agentId,
        constitutionVersion: input.constitutionVersion,
      },
    },
  });
  
  if (existing) {
    return { success: false, error: 'Constitution already signed for this version' };
  }
  
  // Store the signature
  await prisma.constitutionSignature.create({
    data: {
      agentId,
      constitutionVersion: input.constitutionVersion,
      constitutionHash: input.constitutionHash,
      signature: input.signature,
    },
  });
  
  // Audit log
  await writeAuditLog({
    agentId,
    action: AuditActions.CONSTITUTION_SIGN,
    details: {
      after: {
        version: input.constitutionVersion,
        hash: input.constitutionHash,
      },
    },
    ipAddress,
  });
  
  return { success: true };
}

/**
 * Check if an agent has signed the current constitution
 */
export async function hasSignedCurrentConstitution(agentId: string): Promise<boolean> {
  const signature = await prisma.constitutionSignature.findUnique({
    where: {
      agentId_constitutionVersion: {
        agentId,
        constitutionVersion: CURRENT_CONSTITUTION_VERSION,
      },
    },
  });
  
  return signature !== null;
}

/**
 * Get all constitution signatures for an agent
 */
export async function getAgentSignatures(agentId: string) {
  return prisma.constitutionSignature.findMany({
    where: { agentId },
    orderBy: { signedAt: 'desc' },
  });
}
