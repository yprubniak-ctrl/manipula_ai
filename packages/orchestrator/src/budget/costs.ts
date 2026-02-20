/**
 * Model cost definitions and token-pricing utilities.
 */

import { MODEL_COSTS_PER_TOKEN } from '@manipula/shared';

/**
 * Calculate the cost in USD for a given model and token usage.
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = MODEL_COSTS_PER_TOKEN[modelId];
  if (!rates) {
    return (inputTokens + outputTokens) * 0.000015;
  }
  return inputTokens * rates.input + outputTokens * rates.output;
}

/**
 * Estimate the pre-authorization cost (input tokens only).
 */
export function estimatePreAuthCost(modelId: string, estimatedTokens: number): number {
  const rates = MODEL_COSTS_PER_TOKEN[modelId];
  if (!rates) {
    return estimatedTokens * 0.000015;
  }
  return estimatedTokens * rates.input;
}

export { MODEL_COSTS_PER_TOKEN };
