import { PatchValidator } from '../validation/patch-validator';
import { PatchOwnershipViolationError } from '@manipula/shared';

describe('PatchValidator', () => {
  let validator: PatchValidator;
  beforeEach(() => { validator = new PatchValidator(); });

  test('valid patch for BACKEND_GEN passes', () => {
    expect(() => validator.validateOwnership({ backend: { api: {} } }, 'BACKEND_GEN')).not.toThrow();
  });

  test('patch with disallowed key throws PatchOwnershipViolationError', () => {
    expect(() => validator.validateOwnership({ frontend: {} }, 'BACKEND_GEN')).toThrow(PatchOwnershipViolationError);
  });

  test('checkOwnership returns violations array', () => {
    const violations = validator.checkOwnership({ frontend: {}, spec: {} }, 'BACKEND_GEN');
    expect(violations).toContain('frontend');
    expect(violations).toContain('spec');
  });

  test('unknown stage allows all keys', () => {
    expect(() => validator.validateOwnership({ anyKey: {} }, 'UNKNOWN_STAGE')).not.toThrow();
  });

  test('empty patch passes for any stage', () => {
    expect(() => validator.validateOwnership({}, 'SPECIFYING')).not.toThrow();
  });
});
