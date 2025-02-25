// Add polyfills before any imports
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import { validateAgainstModel } from '../src/validators';
import { PerfectValidator, isValidationError } from '../src/types';
import {
  serializeValidationModel,
  deserializeValidationModel,
} from '../src/utils';
import { MongoClient, Db } from 'mongodb';
import { MongoStorage } from '../src/storage/MongoStorage';
import { PV } from '../src/PV';

// Jest will automatically provide these globals
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
  describe('Email Validation', () => {
    const emailModel: PerfectValidator.ValidationModel = {
      email: { type: 'EMAIL' },
    };

    const validEmails = [
      'test@example.com',
      'user.name@domain.com',
      'user+label@domain.com',
      'test.email@subdomain.domain.com',
      'user123@domain.com',
      'USER@DOMAIN.COM',
    ];

    const invalidEmails = [
      'invalid.email',
      '@domain.com',
      'user@.com',
      'user@domain.',
      'user@dom@in.com',
      'user name@domain.com',
      'user@domain..com',
    ];

    test.each(validEmails)('should validate correct email: %s', email => {
      const result = validateAgainstModel({ email }, emailModel);
      expect(isValidationError(result)).toBe(false);
    });

    test.each(invalidEmails)('should reject invalid email: %s', email => {
      const result = validateAgainstModel({ email }, emailModel);
      expect(isValidationError(result)).toBe(true);
    });
  });
  describe('URL Validation', () => {
    const urlModel: PerfectValidator.ValidationModel = {
      url: { type: 'URL' },
    };

    const validUrls = [
      'https://example.com',
      'http://subdomain.example.com',
      'https://example.com:8080',
      'http://example.com/path',
      'https://example.com/path?param=value',
      'https://example.com:8080/path#section',
    ];

    const invalidUrls = [
      'not-a-url',
      'ftp://example.com',
      'http:/example.com',
      'https://example',
      'https://.com',
      'https://example.c',
      'http://example.com:abc',
    ];

    test.each(validUrls)('should validate correct URL: %s', url => {
      const result = validateAgainstModel({ url }, urlModel);
      expect(isValidationError(result)).toBe(false);
    });

    test.each(invalidUrls)('should reject invalid URL: %s', url => {
      const result = validateAgainstModel({ url }, urlModel);
      expect(isValidationError(result)).toBe(true);
    });
  });
  describe('Date Validation', () => {
    const dateModel: PerfectValidator.ValidationModel = {
      date: { type: 'DATE' },
    };

    const validDates = ['2024-03-15', '2000-01-01', '2099-12-31', '2023-11-30'];

    const invalidDates = [
      '2024-13-01', // Invalid month
      '2024-00-01', // Invalid month
      '2024-01-32', // Invalid day
      '2024-01-00', // Invalid day
      '1899-12-31', // Year before 1900
      '2100-01-01', // Year after 2099
      '2024/03/15', // Wrong format
      '15-03-2024', // Wrong format
      '2024-3-15', // Missing leading zero
      '2024-03-5', // Missing leading zero
    ];

    test.each(validDates)('should validate correct date: %s', date => {
      const result = validateAgainstModel({ date }, dateModel);
      expect(isValidationError(result)).toBe(false);
    });

    test.each(invalidDates)('should reject invalid date: %s', date => {
      const result = validateAgainstModel({ date }, dateModel);
      expect(isValidationError(result)).toBe(true);
    });
  });
  describe('Phone Validation', () => {
    const phoneModel: PerfectValidator.ValidationModel = {
      phone: { type: 'PHONE' },
    };

    const validPhones = [
      '+1(555)555-5555',
      '+44 20 7123 4567',
      '+86 123 4567 8901',
      '123-456-7890',
      '+1-555-555-5555',
    ];

    const invalidPhones = [
      '+1',
      '123',
      'abc-def-ghij',
      '+1234567890123456', // Too long
      '555-abc-1234', // Contains letters
      '(555)5555555', // Missing separators
      '+00 123', // Too short
    ];

    test.each(validPhones)('should validate correct phone: %s', phone => {
      const result = validateAgainstModel({ phone }, phoneModel);
      expect(isValidationError(result)).toBe(false);
    });

    test.each(invalidPhones)('should reject invalid phone: %s', phone => {
      const result = validateAgainstModel({ phone }, phoneModel);
      expect(isValidationError(result)).toBe(true);
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

describe('Model Version Integration Tests', () => {
  let client: MongoClient;
  let db: Db;
  let pv: PV;

  beforeAll(async () => {
    // Connect to MongoDB
    client = await MongoClient.connect('mongodb://localhost:27017');
    db = client.db('test_db');
    const storage = new MongoStorage(db);
    pv = new PV(storage);
  });

  // afterAll(async () => {
  //   // Cleanup
  //   await db.dropDatabase();
  //   await client.close();
  // });

  beforeEach(async () => {
    // Clear the collection before each test
    await db.collection('validation_models').deleteMany({});
  });

  const sampleModel: PerfectValidator.ValidationModel = {
    name: { type: 'S', minLength: 2 },
    age: { type: 'N', min: 0 },
  };

  const updatedModel: PerfectValidator.ValidationModel = {
    name: { type: 'S', minLength: 3 }, // Changed minLength
    age: { type: 'N', min: 18 }, // Changed min age
  };

  describe('Model Versioning', () => {
    it('should store and retrieve model versions', async () => {
      // Store version 1
      const result1 = await pv.storeModel('user', sampleModel, 1);
      expect(result1.isValid).toBe(true);

      // Store version 2
      const result2 = await pv.storeModel('user', updatedModel, 2);
      expect(result2.isValid).toBe(true);

      // Get specific versions
      const modelV1: PerfectValidator.ValidationModel | null = await pv.getModelVersion(
        'user',
        1
      );
      const modelV2: PerfectValidator.ValidationModel | null = await pv.getModelVersion(
        'user',
        2
      );
      // console.log(modelV1);
      // console.log(modelV2);

      expect(modelV1).toBeDefined();
      expect(modelV2).toBeDefined();
      // expect(modelV1?.name?.minLength).toBe(2);
      // expect(modelV2?.name?.minLength).toBe(3);
    });

    it('should validate against specific versions', async () => {
      // Store both versions
      await pv.storeModel('user', sampleModel, 1);
      await pv.storeModel('user', updatedModel, 2);

      const validDataV1 = {
        name: 'Jo', // Valid for v1 (minLength: 2)
        age: 15, // Valid for v1 (min: 0)
      };

      const validDataV2 = {
        name: 'Joe', // Valid for v2 (minLength: 3)
        age: 20, // Valid for v2 (min: 18)
      };

      // Validate against version 1
      const resultV1 = await pv.validateDynamic(validDataV1, 'user', 1);
      // console.log(resultV1);
      expect(isValidationError(resultV1)).toBe(false);

      // This should fail against version 2
      const resultV1AgainstV2 = await pv.validateDynamic(
        validDataV1,
        'user',
        2
      );
      // console.log(resultV1AgainstV2);
      expect(isValidationError(resultV1AgainstV2)).toBe(true);

      // Validate against version 2
      const resultV2 = await pv.validateDynamic(validDataV2, 'user', 2);
      expect(isValidationError(resultV2)).toBe(false);
    });

    it('should automatically increment versions when not specified', async () => {
      // Store without specifying version
      const result1 = await pv.storeModel('user', sampleModel);
      expect(result1.isValid).toBe(true);

      const result2 = await pv.storeModel('user', updatedModel);

      expect(result2.isValid).toBe(true);

      // Get latest version
      const latest: PerfectValidator.ValidationModel | null = await pv.getLatestModelVersion(
        'user'
      );
      // console.log(latest);
      expect(latest).toBeDefined();
      // expect(latest?.name.minLength).toBe(3); // Should match updatedModel
    });

    it('should prevent duplicate version numbers', async () => {
      // Store version 1
      await pv.storeModel('user', sampleModel, 1);

      // Attempt to store same version
      const duplicateResult = await pv.storeModel('user', updatedModel, 1);
      // console.log(duplicateResult);
      expect(duplicateResult.isValid).toBe(false);
      // expect(duplicateResult.errors).toContain(expect.stringContaining('already exists'));
    });

    it('should validate against latest version by default', async () => {
      // Store multiple versions
      await pv.storeModel('user', sampleModel, 1);
      await pv.storeModel('user', updatedModel, 2);

      const validDataV1 = {
        name: 'Jo',
        age: 15,
      };

      // Should validate against version 2 (latest) and fail
      const result = await pv.validateDynamic(validDataV1, 'user');
      expect(isValidationError(result)).toBe(true);
    });

    it('should handle non-existent models and versions', async () => {
      // Try to get non-existent model
      await expect(pv.getModelVersion('nonexistent', 1)).rejects.toThrow(
        'Model nonexistent version 1 not found'
      );

      // Try to validate against non-existent version
      const result = await pv.validateDynamic(
        { name: 'Test' },
        'nonexistent',
        1
      );
      // console.log(result);
      expect(isValidationError(result)).toBe(true);
      if (isValidationError(result)) {
        expect(result.errors[0].message).toContain('not found');
      }
    });

    it('should handle complex models with dependencies across versions', async () => {
      const complexModelV1: PerfectValidator.ValidationModel = {
        user: {
          type: 'M',
          fields: {
            age: { type: 'N', min: 13 },
            subscription: {
              type: 'S',
              values: ['FREE', 'PREMIUM'],
              dependsOn: {
                field: 'user.age',
                condition: (age: number) => age < 18,
                validate: (plan: string) => plan !== 'PREMIUM',
                message: 'Users under 18 cannot have PREMIUM plan',
              },
            },
          },
        },
      };

      const complexModelV2: PerfectValidator.ValidationModel = {
        user: {
          type: 'M',
          fields: {
            age: { type: 'N', min: 16 }, // Changed min age
            subscription: {
              type: 'S',
              values: ['FREE', 'PREMIUM', 'PRO'], // Added new plan
              dependsOn: {
                field: 'user.age',
                condition: (age: number) => age < 21, // Changed age check
                validate: (plan: string) => plan === 'FREE',
                message: 'Users under 21 can only have FREE plan',
              },
            },
          },
        },
      };

      // Store both versions
      await pv.storeModel('complex', complexModelV1, 1);
      await pv.storeModel('complex', complexModelV2, 2);

      const testData = {
        user: {
          age: 17,
          subscription: 'PREMIUM',
        },
      };

      // Test against version 1
      const resultV1 = await pv.validateDynamic(testData, 'complex', 1);
      expect(isValidationError(resultV1)).toBe(true);
      if (isValidationError(resultV1)) {
        expect(resultV1.errors[0].message).toBe(
          'Users under 18 cannot have PREMIUM plan'
        );
      }

      // Test against version 2
      const resultV2 = await pv.validateDynamic(testData, 'complex', 2);
      expect(isValidationError(resultV2)).toBe(true);
      if (isValidationError(resultV2)) {
        expect(resultV2.errors[0].message).toBe(
          'Users under 21 can only have FREE plan'
        );
      }
    });
  });
});
