/**
 * Audit Service
 * 
 * Per CLAUDE.md: Rule #11 - EVERY mutation must write to audit_log.
 * This service handles all audit logging for observability.
 * 
 * @module lib/services/audit
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { AuditAction } from '@/constants';

export interface AuditDetails {
  before?: unknown;
  after: unknown;
  metadata?: Record<string, unknown>;
}

export interface AuditLogInput {
  agentId?: string;
  action: AuditAction;
  details: AuditDetails;
  ipAddress?: string;
}

/**
 * Write an audit log entry
 * 
 * IMPORTANT: This should be called for every mutation operation.
 * The audit_log table is append-only - no updates or deletes.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        agentId: input.agentId,
        action: input.action,
        details: input.details as object,
        ipAddress: input.ipAddress,
      },
    });
  } catch (error) {
    // Log but don't throw - audit failures shouldn't break operations
    // In production, you might want to queue this for retry
    logger.error('Failed to write audit log', error, {
      action: input.action,
      agentId: input.agentId,
    });
  }
}

/**
 * Query audit logs for an agent
 */
export async function getAgentAuditLogs(
  agentId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;
  
  return prisma.auditLog.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Query audit logs by action type
 */
export async function getAuditLogsByAction(
  action: AuditAction,
  options: { limit?: number; offset?: number; since?: Date } = {}
) {
  const { limit = 50, offset = 0, since } = options;
  
  return prisma.auditLog.findMany({
    where: {
      action,
      ...(since && { createdAt: { gte: since } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      agent: {
        select: { id: true, handle: true, displayName: true },
      },
    },
  });
}
