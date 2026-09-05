/**
 * Schema fragments shared between stage agents' structured-output schemas.
 */

/** A list of generated files: [{ path, content }] */
export const GENERATED_FILES_SCHEMA: Record<string, unknown> = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['path', 'content'],
    properties: {
      path: { type: 'string', description: 'Relative file path, e.g. src/index.js' },
      content: { type: 'string' },
    },
  },
};

/** Common shape for code-emitting stages (backend / frontend / infra). */
export function codeOutputSchema(extraProperties: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'dependencies', 'files', 'run_instructions', ...Object.keys(extraProperties)],
    properties: {
      summary: { type: 'string' },
      dependencies: { type: 'array', items: { type: 'string' } },
      files: GENERATED_FILES_SCHEMA,
      run_instructions: { type: 'string' },
      ...extraProperties,
    },
  };
}
