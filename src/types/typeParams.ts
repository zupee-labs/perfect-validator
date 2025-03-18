import { PerfectValidator } from './index';

export const ValidationTypeParams: Record<
  PerfectValidator.ValidationType,
  PerfectValidator.IValidationTypeParams
> = {
  S: {
    type: 'String',
    description: 'Text values with optional length and pattern constraints',
    params: [
      {
        name: 'minLength',
        type: 'number',
        description: 'Minimum length of the string',
      },
      {
        name: 'maxLength',
        type: 'number',
        description: 'Maximum length of the string',
      },
      {
        name: 'values',
        type: 'string[]',
        description: 'Array of allowed values',
      },
      {
        name: 'optional',
        type: 'boolean',
        description: 'Whether the field is optional',
      },
      {
        name: 'default',
        type: 'string',
        description: 'Default value if field is not provided',
      },
    ],
  },
  N: {
    type: 'Number',
    description: 'Numeric values with optional range constraints',
    params: [
      {
        name: 'min',
        type: 'number',
        description: 'Minimum allowed value',
      },
      {
        name: 'max',
        type: 'number',
        description: 'Maximum allowed value',
      },
      {
        name: 'integer',
        type: 'boolean',
        description: 'Whether the number must be an integer',
      },
      {
        name:'decimal',
        type:'boolean',
        description:'Whether the number must be a decimal',
      },
      {
        name: 'optional',
        type: 'boolean',
        description: 'Whether the field is optional',
      },
      {
        name: 'values',
        type: 'number[]',
        description: 'Array of allowed values',
      },
      {
        name: 'default',
        type: 'number',
        description: 'Default value if field is not provided',
      },
    ],
  },
  B: {
    type: 'Boolean',
    description: 'True/false values',
    params: [
      {
        name: 'optional',
        type: 'boolean',
        description: 'Whether the field is optional',
      },
      {
        name: 'default',
        type: 'boolean',
        description: 'Default value if field is not provided',
      },
    ],
  },
  L: {
    type: 'Array',
    description: 'Array of values with type validation',
    params: [
      {
        name: 'items',
        type: 'ValidationRule | string',
        description: 'Validation rule for array items',
        required: true,
      },
      {
        name: 'minLength',
        type: 'number',
        description: 'Minimum array length',
      },
      {
        name: 'maxLength',
        type: 'number',
        description: 'Maximum array length',
      },
      {
        name: 'values',
        type: 'any[]',
        description: 'Array of allowed values',
      },
      {
        name: 'optional',
        type: 'boolean',
        description: 'Whether the field is optional',
      },
    ],
  },
  M: {
    type: 'Map',
    description: 'Object with defined field structure',
    params: [
      {
        name: 'fields',
        type: 'Record<string, ValidationRule | string>',
        description: 'Validation rules for object fields',
        required: true,
      },
      {
        name: 'optional',
        type: 'boolean',
        description: 'Whether the field is optional',
      },
    ],
  },
  EMAIL: {
    type: 'Email',
    description: 'Valid email address format',
    params: [
      {
        name: 'optional',
        type: 'boolean',
        description: 'Whether the field is optional',
      },
      {
        name: 'default',
        type: 'string',
        description: 'Default value if field is not provided',
      },
    ],
  },
  URL: {
    type: 'URL',
    description: 'Valid URL format',
    params: [
      {
        name: 'optional',
        type: 'boolean',
        description: 'Whether the field is optional',
      },
      {
        name: 'default',
        type: 'string',
        description: 'Default value if field is not provided',
      },
    ],
  },
  DATE: {
    type: 'Date',
    description: 'Valid date format',
    params: [
      {
        name: 'optional',
        type: 'boolean',
        description: 'Whether the field is optional',
      },
      {
        name: 'default',
        type: 'string',
        description: 'Default value if field is not provided',
      },
    ],
  },
  PHONE: {
    type: 'Phone',
    description: 'Valid phone number format',
    params: [
      {
        name: 'optional',
        type: 'boolean',
        description: 'Whether the field is optional',
      },
      {
        name: 'default',
        type: 'string',
        description: 'Default value if field is not provided',
      },
    ],
  },
  REGEX: {
    type: 'Regex',
    description: 'Custom pattern matching',
    params: [
      {
        name: 'pattern',
        type: 'string',
        description: 'Regular expression pattern',
        required: true,
      },
      {
        name: 'optional',
        type: 'boolean',
        description: 'Whether the field is optional',
      },
    ],
  },
};
