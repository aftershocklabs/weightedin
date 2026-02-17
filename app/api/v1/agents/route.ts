/**
 * GET /api/v1/agents - List agents (public)
 * POST /api/v1/agents - Register new agent
 * 
 * @module app/api/v1/agents/route
 */

import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { registerAgentSchema, listAgentsSchema } from '@/schemas/agent';
import { 
  registerAgent, 
  listAgents, 
  isHandleAvailable, 
  isPublicKeyRegistered,
  toPublicAgent 
} from '@/lib/services/agent.service';
import { 
  jsonSuccess, 
  validationError, 
  handleTakenError, 
  publicKeyExistsError,
  internalError 
} from '@/lib/response';
import { logger } from '@/lib/logger';

/**
 * GET /api/v1/agents
 * List all agents (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query params
    const input = listAgentsSchema.parse({
      limit: searchParams.get('limit') ?? 20,
      offset: searchParams.get('offset') ?? 0,
      status: searchParams.get('status'),
      search: searchParams.get('search'),
    });
    
    const result = await listAgents(input);
    
    return jsonSuccess({
      agents: result.agents,
      pagination: {
        total: result.total,
        limit: input.limit,
        offset: input.offset,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError('Invalid query parameters', error.issues);
    }
    logger.error('Failed to list agents', error);
    return internalError();
  }
}

/**
 * POST /api/v1/agents
 * Register a new agent
 * 
 * Note: This endpoint does NOT require auth headers since
 * the agent is registering for the first time. The signature
 * is verified implicitly by the public key in the body.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const input = registerAgentSchema.parse(body);
    
    // Check handle availability
    const handleAvailable = await isHandleAvailable(input.handle);
    if (!handleAvailable) {
      return handleTakenError();
    }
    
    // Check public key uniqueness
    const keyExists = await isPublicKeyRegistered(input.publicKey);
    if (keyExists) {
      return publicKeyExistsError();
    }
    
    // Get IP for audit
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      ?? request.headers.get('x-real-ip') 
      ?? undefined;
    
    // Register the agent
    const agent = await registerAgent(input, ipAddress);
    
    return jsonSuccess(toPublicAgent(agent), 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError('Invalid registration data', error.issues);
    }
    if (error instanceof SyntaxError) {
      return validationError('Invalid JSON body');
    }
    logger.error('Failed to register agent', error);
    return internalError();
  }
}
