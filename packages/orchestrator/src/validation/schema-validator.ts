/**
 * JSON Schema validator for agent patches using zod.
 */

import { z, ZodError } from 'zod';

export const STAGE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  SPECIFYING:    z.object({ spec:         z.record(z.unknown()).optional() }),
  ARCHITECTING:  z.object({ architecture: z.record(z.unknown()).optional() }),
  BACKEND_GEN:   z.object({ backend:      z.record(z.unknown()).optional() }),
  FRONTEND_GEN:  z.object({ frontend:     z.record(z.unknown()).optional() }),
  QA_VALIDATION: z.object({ qa:           z.record(z.unknown()).optional() }),
  DEPLOYING:     z.object({ infra:        z.record(z.unknown()).optional() }),
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that an agent patch conforms to the schema for its stage.
 */
export class SchemaValidator {
  validate(stageName: string, patch: Record<string, unknown>): ValidationResult {
    const schema = STAGE_SCHEMAS[stageName];
    if (!schema) {
      return { valid: true, errors: [] };
    }
    const result = schema.safeParse(patch);
    if (result.success) {
      return { valid: true, errors: [] };
    }
    return { valid: false, errors: this.formatZodErrors(result.error) };
  }

  getSchemaHint(stageName: string): string {
    const schema = STAGE_SCHEMAS[stageName];
    if (!schema) return '';
    return `Expected patch shape for ${stageName}: ${JSON.stringify(schema.description ?? 'see stage schema')}`;
  }

  private formatZodErrors(error: ZodError): string[] {
    return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  }
}
