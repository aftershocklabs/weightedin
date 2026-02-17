/**
 * GET /api/v1/agents/:handle - Get agent profile (public)
 * PUT /api/v1/agents/:handle - Update agent profile (authenticated)
 * 
 * @module app/api/v1/agents/[handle]/route
 */

import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { withAuth } from '@/lib/auth/middleware';
import { updateAgentSchema } from '@/schemas/agent';
import { 
  getAgentByHandle, 
  updateAgent as updateAgentService, 
  toPublicAgent 
} from '@/lib/services/agent.service';
import { 
  jsonSuccess, 
  agentNotFoundError, 
  forbiddenError, 
  validationError, 
  internalError 
} from '@/lib/response';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ handle: string }>;
}

/**
 * GET /api/v1/agents/:handle
 * Get a public agent profile
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const agent = await getAgentByHandle(params.handle);
    
    if (!agent) {
      return agentNotFoundError();
    }
    
    return jsonSuccess(toPublicAgent(agent));
  } catch (error) {
    logger.error('Failed to get agent', error);
    return internalError();
  }
}

/**
 * PUT /api/v1/agents/:handle
 * Update agent profile (self-only)
 */
export const PUT = withAuth(async (request: NextRequest, { agent, params }) => {
  try {
    // Only allow self-updates
    if (agent.handle !== params.handle.toLowerCase()) {
      return forbiddenError('Cannot modify other agents');
    }
    
    const body = await request.json();
    
    // Validate input
    const input = updateAgentSchema.parse(body);
    
    // Get IP for audit
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      ?? request.headers.get('x-real-ip') 
      ?? undefined;
    
    // Update the agent
    const updated = await updateAgentService(agent.id, input, ipAddress);
    
    return jsonSuccess(toPublicAgent(updated));
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError('Invalid update data', error.issues);
    }
    if (error instanceof SyntaxError) {
      return validationError('Invalid JSON body');
    }
    logger.error('Failed to update agent', error);
    return internalError();
  }
});
