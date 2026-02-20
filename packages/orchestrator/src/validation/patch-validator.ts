/**
 * Patch ownership validator — ensures agents only write to their permitted state keys.
 */

import { STAGE_OWNERSHIP, PatchOwnershipViolationError } from '@manipula/shared';

/**
 * Validates that a patch produced by an agent only touches the state keys
 * that the owning stage is permitted to write.
 */
export class PatchValidator {
  validateOwnership(patch: Record<string, unknown>, stageName: string): void {
    const allowed = STAGE_OWNERSHIP[stageName];
    if (!allowed) return;

    const allowedSet = new Set(allowed);
    const violations = Object.keys(patch).filter((key) => !allowedSet.has(key));

    if (violations.length > 0) {
      throw new PatchOwnershipViolationError(
        `Agent in stage ${stageName} attempted to write to disallowed keys: ${violations.join(', ')}. ` +
        `Allowed keys: ${allowed.join(', ')}`
      );
    }
  }

  checkOwnership(patch: Record<string, unknown>, stageName: string): string[] {
    const allowed = STAGE_OWNERSHIP[stageName];
    if (!allowed) return [];
    const allowedSet = new Set(allowed);
    return Object.keys(patch).filter((key) => !allowedSet.has(key));
  }
}
