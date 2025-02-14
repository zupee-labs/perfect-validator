import { validateAgainstModel } from '../src/validators';
import { PerfectValidator, isValidationError } from '../src/types';
import {
  serializeValidationModel,
  deserializeValidationModel,
} from '../src/utils';

// Jest will automatically provide these globalss
// No need to import describe, it, expect

describe('Dynamic Validator Tests', () => {
  describe('validateAgainstModel', () => {
    it('should validate a simple model successfully', () => {
      const model: PerfectValidator.ValidationModel = {
        name: {
          type: 'S',
          minLength: 2,
          maxLength: 50,
        },
        age: {
          type: 'N',
          min: 0,
          max: 150,
        },
        isActive: 'B',
      };

      const data = {
        name: 'John Doe',
        age: 30,
        isActive: true,
      };

      const result = validateAgainstModel(data, model);
      expect(isValidationError(result)).toBe(false);
      if (!isValidationError(result)) {
        expect(result.data).toEqual(data);
      }
    });

    it('should reject invalid type', () => {
      const model: PerfectValidator.ValidationModel = {
        field: {
          type: 'INVALID' as any,
        },
      };

      const result = validateAgainstModel({ field: 'test' }, model);
      expect(isValidationError(result)).toBe(true);
      if (isValidationError(result)) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should validate nested objects', () => {
      const model: PerfectValidator.ValidationModel = {
        user: {
          type: 'M',
          fields: {
            name: 'S',
            details: {
              type: 'M',
              fields: {
                age: 'N',
              },
            },
          },
        },
      };

      const data = {
        user: {
          name: 'John',
          details: {
            age: 25,
          },
        },
      };

      const result = validateAgainstModel(data, model);
      expect(isValidationError(result)).toBe(false);
      if (!isValidationError(result)) {
        expect(result.data).toEqual(data);
      }
    });

    it('should validate array type', () => {
      const model: PerfectValidator.ValidationModel = {
        scores: {
          type: 'L',
          items: {
            type: 'N',
            min: 0,
            max: 100,
            values: [85, 90, 95],
          },
        },
      };

      const data = {
        scores: [85, 90, 95],
      };

      const result = validateAgainstModel(data, model);
      expect(isValidationError(result)).toBe(false);
      if (!isValidationError(result)) {
        expect(result.data).toEqual(data);
      }
    });

    it('should validate dependencies', () => {
      const model: PerfectValidator.ValidationModel = {
        maxPlayers: {
          type: 'N',
          min: 2,
          max: 4,
        },
        minPlayers: {
          type: 'N',
          dependsOn: {
            field: 'maxPlayers',
            condition: max => max >= 2,
            validate: (min, max) => min <= max,
            message: 'Min players must be less than max players',
          },
        },
      };

      const validData = {
        maxPlayers: 4,
        minPlayers: 2,
      };

      const validResult = validateAgainstModel(validData, model);
      expect(isValidationError(validResult)).toBe(false);
      if (!isValidationError(validResult)) {
        expect(validResult.data).toEqual(validData);
      }

      const invalidData = {
        maxPlayers: 2,
        minPlayers: 4,
      };

      const invalidResult = validateAgainstModel(invalidData, model);
      expect(isValidationError(invalidResult)).toBe(true);
      if (isValidationError(invalidResult)) {
        expect(invalidResult.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Model Serialization/Deserialization', () => {
    it('should serialize and deserialize simple model', () => {
      const originalModel: PerfectValidator.ValidationModel = {
        name: { type: 'S' },
        age: { type: 'N', min: 0 },
        isActive: 'B',
      };

      const serialized = serializeValidationModel(originalModel);
      const deserialized = deserializeValidationModel(serialized);

      expect(deserialized).toEqual(originalModel);
    });

    it('should handle nested dependencies', () => {
      const originalModel: PerfectValidator.ValidationModel = {
        maxPlayers: {
          type: 'N',
          min: 2,
          max: 4,
        },
        minPlayers: {
          type: 'N',
          dependsOn: {
            field: 'maxPlayers',
            condition: max => max >= 2,
            validate: (min, max) => min <= max,
            message: 'Min players must be less than max players',
          },
        },
      };

      const serialized = serializeValidationModel(originalModel);
      const deserialized = deserializeValidationModel(serialized);

      // Test dependency validation after deserialization
      const validData = { maxPlayers: 4, minPlayers: 2 };
      const invalidData = { maxPlayers: 2, minPlayers: 4 };

      const validResult = validateAgainstModel(validData, deserialized);
      const invalidResult = validateAgainstModel(invalidData, deserialized);

      expect(isValidationError(validResult)).toBe(false);
      expect(isValidationError(invalidResult)).toBe(true);
    });

    it('should handle complex nested structures', () => {
      const originalModel: PerfectValidator.ValidationModel = {
        user: {
          type: 'M',
          fields: {
            name: { type: 'S' },
            scores: {
              type: 'L',
              items: {
                type: 'M',
                fields: {
                  value: {
                    type: 'N',
                    min: 0,
                  },
                  grade: {
                    type: 'S',
                    values: ['A', 'B', 'C'],
                    dependsOn: [
                      {
                        field: 'value',
                        condition: (value: number) => {
                          return value >= 90;
                        },
                        validate: (grade: string, value: number) => {
                          return grade === 'A';
                        },
                        message: 'Scores >= 90 must have grade A',
                      },
                      {
                        field: 'value',
                        condition: (value: number) => {
                          return value >= 80 && value < 90;
                        },
                        validate: (grade: string, value: number) => {
                          return grade === 'B';
                        },
                        message: 'Scores between 80 and 89 must have grade B',
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      };

      const serialized = serializeValidationModel(originalModel);
      const deserialized = deserializeValidationModel(serialized);

      // Test valid data
      const validData = {
        user: {
          name: 'John',
          scores: [
            { value: 95, grade: 'A' },
            { value: 85, grade: 'B' },
            { value: 75, grade: 'C' },
          ],
        },
      };

      const validResult = validateAgainstModel(validData, deserialized);

      expect(isValidationError(validResult)).toBe(false);
      if (!isValidationError(validResult)) {
        expect(validResult.data).toEqual(validData);
      }

      const invalidData = {
        user: {
          name: 'John',
          scores: [
            { value: 95, grade: 'B' }, // Invalid: >=90 must be A
          ],
        },
      };

      const invalidResult = validateAgainstModel(invalidData, deserialized);
      expect(isValidationError(invalidResult)).toBe(true);
      if (isValidationError(invalidResult)) {
        expect(invalidResult.errors.length).toBeGreaterThan(0);
        expect(invalidResult.errors[0].message).toBe(
          'Scores >= 90 must have grade A'
        );
      }
    });

    it('should handle array of functions in model', () => {
      const originalModel: PerfectValidator.ValidationModel = {
        values: {
          type: 'L',
          items: {
            type: 'N',
            dependsOn: {
              field: 'someField',
              condition: (someField: number) => someField > 0,
              validate: (current: number, someField: number) =>
                current > 0 && current % 2 === 0,
              message:
                'Array items must be positive even numbers when someField is positive',
            },
          },
        },
        someField: {
          type: 'N',
          min: 0,
        },
      };

      const serialized = serializeValidationModel(originalModel);
      const deserialized = deserializeValidationModel(serialized);

      const validData = {
        values: [2, 4, 6],
        someField: 1,
      };

      const invalidData = {
        values: [1, 3, 5],
        someField: 1,
      };

      const validResult = validateAgainstModel(validData, deserialized);

      const invalidResult = validateAgainstModel(invalidData, deserialized);

      expect(isValidationError(validResult)).toBe(false);
      if (!isValidationError(validResult)) {
        expect(validResult.data).toEqual(validData);
      }

      expect(isValidationError(invalidResult)).toBe(true);
      if (isValidationError(invalidResult)) {
        expect(invalidResult.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle multiple dependency functions', () => {
      const originalModel: PerfectValidator.ValidationModel = {
        value: {
          type: 'N',
          dependsOn: [
            {
              field: 'min',
              condition: (min: number) => min !== undefined,
              validate: (value: number, min: number) => value >= min,
              message: 'Value must be greater than min',
            },
            {
              field: 'max',
              condition: (max: number) => max !== undefined,
              validate: (value: number, max: number) => value <= max,
              message: 'Value must be less than max',
            },
          ],
        },
        min: { type: 'N' },
        max: { type: 'N' },
      };

      const serialized = serializeValidationModel(originalModel);
      const deserialized = deserializeValidationModel(serialized);

      const validData = {
        value: 5,
        min: 0,
        max: 10,
      };

      const invalidData = {
        value: 15, // Invalid: greater than max
        min: 0,
        max: 10,
      };

      const validResult = validateAgainstModel(validData, deserialized);
      const invalidResult = validateAgainstModel(invalidData, deserialized);

      expect(isValidationError(validResult)).toBe(false);
      expect(isValidationError(invalidResult)).toBe(true);
    });

    it('should handle different function formats', () => {
      const model: PerfectValidator.ValidationModel = {
        field1: {
          type: 'N',
          dependsOn: {
            field: 'other',
            condition: (value: number) => value > 0,
            validate: (current: number, other: number) => current < other,
            message: 'Test message for field1',
          },
        },
        field2: {
          type: 'N',
          dependsOn: {
            field: 'other',
            condition: (value: number) => {
              return value > 0 && value < 100;
            },
            validate: (current: number, other: number) => {
              const isValid = current < other;
              return isValid;
            },
            message: 'Test message for field2',
          },
        },
        field3: {
          type: 'N',
          dependsOn: {
            field: 'other',
            condition: function(value: number) {
              return value > 0;
            },
            validate: function(current: number, other: number) {
              if (current >= other) {
                return false;
              }
              return true;
            },
            message: 'Test message for field3',
          },
        },
        other: { type: 'N' },
      };

      const invalidData = {
        field1: 150,
        field2: 150,
        field3: 150,
        other: 100,
      };

      const invalidResult = validateAgainstModel(invalidData, model);
      expect(isValidationError(invalidResult)).toBe(true);
      if (isValidationError(invalidResult)) {
        expect(invalidResult.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle complex function logic', () => {
      const originalModel: PerfectValidator.ValidationModel = {
        value: {
          type: 'N',
          dependsOn: {
            field: 'config',
            condition: (config: any) => {
              if (!config || typeof config !== 'object') {
                return false;
              }
              const { min, max } = config;
              return min !== undefined && max !== undefined && min < max;
            },
            validate: (value: number, config: any) => {
              const { min, max, isEven } = config;
              if (value < min || value > max) {
                return false;
              }
              if (isEven && value % 2 !== 0) {
                return false;
              }
              return true;
            },
            message: 'Invalid value for given configuration',
          },
        },
        config: {
          type: 'M',
          fields: {
            min: { type: 'N' },
            max: { type: 'N' },
            isEven: { type: 'B' },
          },
        },
      };

      const serialized = serializeValidationModel(originalModel);
      const deserialized = deserializeValidationModel(serialized);

      const validData = {
        value: 6,
        config: {
          min: 0,
          max: 10,
          isEven: true,
        },
      };

      const invalidData = {
        value: 5,
        config: {
          min: 0,
          max: 10,
          isEven: true,
        },
      };

      const validResult = validateAgainstModel(validData, deserialized);
      const invalidResult = validateAgainstModel(invalidData, deserialized);

      expect(isValidationError(validResult)).toBe(false);
      expect(isValidationError(invalidResult)).toBe(true);
    });
  });

  describe('Function Serialization/Deserialization', () => {
    it('should handle single-line arrow functions', () => {
      const model: PerfectValidator.ValidationModel = {
        value: {
          type: 'N',
          dependsOn: {
            field: 'other',
            condition: (value: number) => value > 0,
            validate: (current: number, other: number) => current < other,
            message: 'Test validation',
          },
        },
        other: { type: 'N' },
      };

      const serialized = serializeValidationModel(model);
      const deserialized = deserializeValidationModel(serialized);

      const validData = { value: 5, other: 10 };
      const invalidData = { value: 15, other: 10 };

      const validResult = validateAgainstModel(validData, deserialized);
      const invalidResult = validateAgainstModel(invalidData, deserialized);

      expect(isValidationError(validResult)).toBe(false);
      expect(isValidationError(invalidResult)).toBe(true);
    });

    it('should handle multi-line arrow functions', () => {
      const model: PerfectValidator.ValidationModel = {
        value: {
          type: 'N',
          dependsOn: {
            field: 'other',
            condition: (value: number) => {
              const minValue = 0;
              const result = value > minValue;
              return result;
            },
            validate: (current: number, other: number) => {
              if (current >= other) {
                return false;
              }
              return true;
            },
            message: 'Test validation',
          },
        },
        other: { type: 'N' },
      };

      const serialized = serializeValidationModel(model);

      const deserialized = deserializeValidationModel(serialized);

      const validData = { value: 50, other: 100 };
      const invalidData = { value: 150, other: 100 };

      const validResult = validateAgainstModel(validData, deserialized);

      const invalidResult = validateAgainstModel(invalidData, deserialized);

      expect(isValidationError(validResult)).toBe(false);
      expect(isValidationError(invalidResult)).toBe(true);
    });

    it('should handle regular functions', () => {
      const model: PerfectValidator.ValidationModel = {
        value: {
          type: 'N',
          dependsOn: {
            field: 'other',
            condition: function(value: number) {
              return value > 0 && value < 100;
            },
            validate: function(current: number, other: number) {
              return current < other;
            },
            message: 'Test validation',
          },
        },
        other: { type: 'N' },
      };

      const serialized = serializeValidationModel(model);
      const deserialized = deserializeValidationModel(serialized);

      const validData = { value: 50, other: 99 };
      const invalidData = { value: 150, other: 99 };

      const validResult = validateAgainstModel(validData, deserialized);
      const invalidResult = validateAgainstModel(invalidData, deserialized);

      expect(isValidationError(validResult)).toBe(false);
      expect(isValidationError(invalidResult)).toBe(true);
    });

    it('should handle complex function logic', () => {
      const model: PerfectValidator.ValidationModel = {
        value: {
          type: 'N',
          dependsOn: {
            field: 'config',
            condition: (config: any) => {
              if (!config || typeof config !== 'object') {
                return false;
              }
              const { min, max, isEven } = config;
              const result =
                min !== undefined &&
                max !== undefined &&
                min < max &&
                typeof isEven === 'boolean';
              return result;
            },
            validate: (value: number, config: any) => {
              const { min, max, isEven } = config;
              if (value < min || value > max) {
                return false;
              }
              if (isEven && value % 2 !== 0) {
                return false;
              }
              return true;
            },
            message: 'Invalid value for given configuration',
          },
        },
        config: {
          type: 'M',
          fields: {
            min: { type: 'N' },
            max: { type: 'N' },
            isEven: { type: 'B' },
          },
        },
      };

      const serialized = serializeValidationModel(model);

      const deserialized = deserializeValidationModel(serialized);

      const validData = {
        value: 6,
        config: { min: 0, max: 10, isEven: true },
      };

      const invalidData = {
        value: 5, // Odd number when even is required
        config: { min: 0, max: 10, isEven: true },
      };

      const validResult = validateAgainstModel(validData, deserialized);

      const invalidResult = validateAgainstModel(invalidData, deserialized);

      expect(isValidationError(validResult)).toBe(false);
      expect(isValidationError(invalidResult)).toBe(true);
      expect(isValidationError(invalidResult)).toBe(true);
    });
  });
});

describe('Dependency Validation Tests', () => {
  it('should validate nested path dependencies', () => {
    const model: PerfectValidator.ValidationModel = {
      user: {
        type: 'M',
        fields: {
          profile: {
            type: 'M',
            fields: {
              age: { type: 'N' },
              canDrink: {
                type: 'B',
                dependsOn: {
                  field: 'age',
                  condition: (age: number) => age !== undefined,
                  validate: (canDrink: boolean, age: number) => {
                    if (age < 21 && canDrink === true) return false;
                    return true;
                  },
                  message: 'Cannot drink if under 21',
                },
              },
            },
          },
        },
      },
    };

    const validData = {
      user: {
        profile: {
          age: 25,
          canDrink: true,
        },
      },
    };

    const invalidData = {
      user: {
        profile: {
          age: 18,
          canDrink: true,
        },
      },
    };

    const validResult = validateAgainstModel(validData, model);
    const invalidResult = validateAgainstModel(invalidData, model);

    expect(isValidationError(validResult)).toBe(false);
    expect(isValidationError(invalidResult)).toBe(true);
    if (isValidationError(invalidResult)) {
      expect(invalidResult.errors[0].message).toBe('Cannot drink if under 21');
    }
  });

  it('should validate cross-object dependencies', () => {
    const model: PerfectValidator.ValidationModel = {
      order: {
        type: 'M',
        fields: {
          total: { type: 'N' },
        },
      },
      payment: {
        type: 'M',
        fields: {
          method: {
            type: 'S',
            values: ['CREDIT', 'DEBIT', 'CASH'],
            dependsOn: {
              field: 'order.total',
              condition: (total: number) => total > 1000,
              validate: (method: string) => method !== 'CASH',
              message: 'Orders over 1000 cannot be paid in cash',
            },
          },
        },
      },
    };

    const validData = {
      order: { total: 1500 },
      payment: { method: 'CREDIT' },
    };

    const invalidData = {
      order: { total: 1500 },
      payment: { method: 'CASH' },
    };

    const validResult = validateAgainstModel(validData, model);
    const invalidResult = validateAgainstModel(invalidData, model);

    expect(isValidationError(validResult)).toBe(false);
    expect(isValidationError(invalidResult)).toBe(true);
    if (isValidationError(invalidResult)) {
      expect(invalidResult.errors[0].message).toBe(
        'Orders over 1000 cannot be paid in cash'
      );
    }
  });

  it('should validate array item dependencies', () => {
    const model: PerfectValidator.ValidationModel = {
      students: {
        type: 'L',
        items: {
          type: 'M',
          fields: {
            grade: { type: 'N' },
            status: {
              type: 'S',
              values: ['PASS', 'FAIL'],
              dependsOn: {
                field: 'grade',
                condition: (grade: number) => grade !== undefined,
                validate: (status: string, grade: number) => {
                  if (grade < 60 && status === 'PASS') return false;
                  if (grade >= 60 && status === 'FAIL') return false;
                  return true;
                },
                message: 'Status must match grade threshold',
              },
            },
          },
        },
      },
    };

    // Test serialization and deserialization
    const serialized = serializeValidationModel(model);

    const deserialized = deserializeValidationModel(serialized);

    const validData = {
      students: [
        { grade: 75, status: 'PASS' },
        { grade: 45, status: 'FAIL' },
      ],
    };

    const invalidData = {
      students: [
        { grade: 55, status: 'PASS' },
        { grade: 85, status: 'FAIL' },
      ],
    };

    // Test with deserialized model
    const validResult = validateAgainstModel(validData, deserialized);

    const invalidResult = validateAgainstModel(invalidData, deserialized);

    expect(isValidationError(validResult)).toBe(false);
    expect(isValidationError(invalidResult)).toBe(true);
    if (isValidationError(invalidResult)) {
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      expect(invalidResult.errors[0].message).toBe(
        'Status must match grade threshold'
      );
    }
  });

  it('should handle multiple dependencies', () => {
    const model: PerfectValidator.ValidationModel = {
      shipping: {
        type: 'M',
        fields: {
          method: {
            type: 'S',
            values: ['STANDARD', 'EXPRESS', 'OVERNIGHT'],
            dependsOn: [
              {
                field: 'shipping.weight',
                condition: (weight: number) => weight > 50,
                validate: (method: string) => method !== 'STANDARD',
                message: 'Heavy items cannot use standard shipping',
              },
              {
                field: 'shipping.international',
                condition: (isInt: boolean) => isInt === true,
                validate: (method: string) => method === 'EXPRESS',
                message: 'International orders must use express shipping',
              },
            ],
          },
          weight: { type: 'N' },
          international: { type: 'B' },
        },
      },
    };

    const validData = {
      shipping: {
        method: 'EXPRESS',
        weight: 60,
        international: true,
      },
    };

    const invalidData1 = {
      shipping: {
        method: 'STANDARD',
        weight: 55,
        international: false,
      },
    };

    const invalidData2 = {
      shipping: {
        method: 'OVERNIGHT',
        weight: 30,
        international: true,
      },
    };

    const validResult = validateAgainstModel(validData, model);
    const invalidResult1 = validateAgainstModel(invalidData1, model);
    const invalidResult2 = validateAgainstModel(invalidData2, model);

    expect(isValidationError(validResult)).toBe(false);
    expect(isValidationError(invalidResult1)).toBe(true);
    expect(isValidationError(invalidResult2)).toBe(true);

    if (isValidationError(invalidResult1)) {
      expect(invalidResult1.errors[0].message).toBe(
        'Heavy items cannot use standard shipping'
      );
    }
    if (isValidationError(invalidResult2)) {
      expect(invalidResult2.errors[0].message).toBe(
        'International orders must use express shipping'
      );
    }
  });

  it('should handle circular dependencies', () => {
    const model: PerfectValidator.ValidationModel = {
      min: {
        type: 'N',
        dependsOn: {
          field: 'max',
          condition: (max: number) => max !== undefined,
          validate: (min: number, max: number) => min < max,
          message: 'Min must be less than max',
        },
      },
      max: {
        type: 'N',
        dependsOn: {
          field: 'min',
          condition: (min: number) => min !== undefined,
          validate: (max: number, min: number) => max > min,
          message: 'Max must be greater than min',
        },
      },
    };

    const validData = {
      min: 0,
      max: 100,
    };

    const invalidData = {
      min: 100,
      max: 50,
    };

    const validResult = validateAgainstModel(validData, model);
    const invalidResult = validateAgainstModel(invalidData, model);

    expect(isValidationError(validResult)).toBe(false);
    expect(isValidationError(invalidResult)).toBe(true);
    if (isValidationError(invalidResult)) {
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      expect(invalidResult.errors[0].message).toBe('Min must be less than max');
      expect(invalidResult.errors[1].message).toBe(
        'Max must be greater than min'
      );
    }
  });
});
