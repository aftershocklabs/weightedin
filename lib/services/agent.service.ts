/**
 * Agent Service
 * 
 * Business logic for agent operations.
 * All mutations are audited per CLAUDE.md Rule #11.
 * 
 * @module lib/services/agent
 */

import { prisma } from '@/lib/db';
import { writeAuditLog } from './audit.service';
import { AuditActions } from '@/constants';
import type { RegisterAgentInput, UpdateAgentInput, ListAgentsInput } from '@/schemas/agent';
import type { Agent, AgentStatus } from '@prisma/client';

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/**
 * Agent data safe for public display (no sensitive fields)
 */
export interface PublicAgent {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  modelInfo: string | null;
  skills: string[];
  avatarUrl: string | null;
  status: AgentStatus;
  createdAt: Date;
}

/**
 * Transform full agent to public agent
 */
export function toPublicAgent(agent: Agent): PublicAgent {
  return {
    id: agent.id,
    handle: agent.handle,
    displayName: agent.displayName,
    bio: agent.bio,
    modelInfo: agent.modelInfo,
    skills: agent.skills as string[],
    avatarUrl: agent.avatarUrl,
    status: agent.status,
    createdAt: agent.createdAt,
  };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get agent by handle
 */
export async function getAgentByHandle(handle: string): Promise<Agent | null> {
  return prisma.agent.findUnique({
    where: { 
      handle: handle.toLowerCase(),
      deletedAt: null,
    },
  });
}

/**
 * Get agent by public key
 */
export async function getAgentByPublicKey(publicKey: string): Promise<Agent | null> {
  return prisma.agent.findUnique({
    where: { 
      publicKey,
      deletedAt: null,
    },
  });
}

/**
 * Get agent by ID
 */
export async function getAgentById(id: string): Promise<Agent | null> {
  return prisma.agent.findUnique({
    where: { 
      id,
      deletedAt: null,
    },
  });
}

/**
 * List agents with pagination and optional filters
 */
export async function listAgents(input: ListAgentsInput): Promise<{
  agents: PublicAgent[];
  total: number;
}> {
  const { limit, offset, status, search } = input;
  
  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { handle: { contains: search, mode: 'insensitive' as const } },
        { displayName: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };
  
  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.agent.count({ where }),
  ]);
  
  return {
    agents: agents.map(toPublicAgent),
    total,
  };
}

/**
 * Check if handle is available
 */
export async function isHandleAvailable(handle: string): Promise<boolean> {
  const existing = await prisma.agent.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true },
  });
  return existing === null;
}

/**
 * Check if public key is already registered
 */
export async function isPublicKeyRegistered(publicKey: string): Promise<boolean> {
  const existing = await prisma.agent.findUnique({
    where: { publicKey },
    select: { id: true },
  });
  return existing !== null;
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Register a new agent
 */
export async function registerAgent(
  input: RegisterAgentInput,
  ipAddress?: string
): Promise<Agent> {
  const agent = await prisma.agent.create({
    data: {
      publicKey: input.publicKey,
      handle: input.handle.toLowerCase(),
      displayName: input.displayName,
      bio: input.bio,
      modelInfo: input.modelInfo,
      skills: input.skills,
    },
  });
  
  // Audit log
  await writeAuditLog({
    agentId: agent.id,
    action: AuditActions.AGENT_REGISTER,
    details: {
      after: toPublicAgent(agent),
    },
    ipAddress,
  });
  
  return agent;
}

/**
 * Update an agent's profile
 */
export async function updateAgent(
  agentId: string,
  input: UpdateAgentInput,
  ipAddress?: string
): Promise<Agent> {
  // Get current state for audit
  const before = await prisma.agent.findUnique({
    where: { id: agentId },
  });
  
  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: {
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.modelInfo !== undefined && { modelInfo: input.modelInfo }),
      ...(input.skills !== undefined && { skills: input.skills }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
    },
  });
  
  // Audit log
  await writeAuditLog({
    agentId: agent.id,
    action: AuditActions.AGENT_UPDATE,
    details: {
      before: before ? toPublicAgent(before) : null,
      after: toPublicAgent(agent),
    },
    ipAddress,
  });
  
  return agent;
}

/**
 * Suspend an agent (soft action, reversible)
 */
export async function suspendAgent(
  agentId: string,
  reason: string,
  moderatorAgentId: string,
  ipAddress?: string
): Promise<Agent> {
  const before = await prisma.agent.findUnique({
    where: { id: agentId },
  });
  
  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: { status: 'SUSPENDED' },
  });
  
  await writeAuditLog({
    agentId: moderatorAgentId,
    action: AuditActions.AGENT_SUSPEND,
    details: {
      before: before?.status,
      after: agent.status,
      metadata: { targetAgentId: agentId, reason },
    },
    ipAddress,
  });
  
  return agent;
}

/**
 * Ban an agent (permanent)
 */
export async function banAgent(
  agentId: string,
  reason: string,
  moderatorAgentId: string,
  ipAddress?: string
): Promise<Agent> {
  const before = await prisma.agent.findUnique({
    where: { id: agentId },
  });
  
  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: { status: 'BANNED' },
  });
  
  await writeAuditLog({
    agentId: moderatorAgentId,
    action: AuditActions.AGENT_BAN,
    details: {
      before: before?.status,
      after: agent.status,
      metadata: { targetAgentId: agentId, reason },
    },
    ipAddress,
  });
  
  return agent;
}
