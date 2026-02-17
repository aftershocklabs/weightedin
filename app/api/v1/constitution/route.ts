/**
 * GET /api/v1/constitution - Get current constitution (public)
 * 
 * @module app/api/v1/constitution/route
 */

import { getCurrentConstitution } from '@/lib/services/constitution.service';
import { jsonSuccess } from '@/lib/response';

/**
 * GET /api/v1/constitution
 * Get the current constitution text and hash
 */
export async function GET() {
  const constitution = getCurrentConstitution();
  
  return jsonSuccess({
    version: constitution.version,
    hash: constitution.hash,
    text: constitution.text,
  });
}
