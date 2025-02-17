export namespace PerfectValidator {
  export type ValidationType =
    | 'S'
    | 'N'
    | 'B'
    | 'L'
    | 'M'
    | 'EMAIL'
    | 'URL'
    | 'DATE'
    | 'PHONE'
    | 'REGEX';
  export const ValidationTypes: Record<string, ValidationType> = {
    STRING: 'S' as ValidationType,
    NUMBER: 'N' as ValidationType,
    BOOLEAN: 'B' as ValidationType,
    LIST: 'L' as ValidationType,
    MAP: 'M' as ValidationType,
    EMAIL: 'EMAIL' as ValidationType,
    URL: 'URL' as ValidationType,
    DATE: 'DATE' as ValidationType,
    PHONE: 'PHONE' as ValidationType,
    REGEX: 'REGEX' as ValidationType,
  } as const;
  export const DataTypeDescriptions: Record<ValidationType, string> = {
    S: 'String type - Text values with optional length and pattern constraints',
    N: 'Number type - Numeric values with optional range constraints',
    B: 'Boolean type - True/false values',
    L: 'List type - Array of values with type validation',
    M: 'Map type - Object with defined field structure',
    EMAIL: 'Email type - Valid email address format',
    URL: 'URL type - Valid URL format',
    DATE: 'Date type - Valid date format',
    PHONE: 'Phone type - Valid phone number format',
    REGEX: 'Regex type - Custom pattern matching',
  } as const;
  export interface IValidationTypeParams {
    type: string;
    description: string;
    params: {
      name: string;
      type: string;
      description: string;
      required?: boolean;
    }[];
  }
  export const ValidationTypeParams: Record<ValidationType, IValidationTypeParams> = {
    'S': {
      type: 'String',
      description: 'Text values with optional length and pattern constraints',
      params: [
        {
          name: 'minLength',
          type: 'number',
          description: 'Minimum length of the string'
        },
        {
          name: 'maxLength',
          type: 'number',
          description: 'Maximum length of the string'
        },
        {
          name: 'values',
          type: 'string[]',
          description: 'Array of allowed values'
        },
        {
          name: 'optional',
          type: 'boolean',
          description: 'Whether the field is optional'
        },
        {
          name: 'default',
          type: 'string',
          description: 'Default value if field is not provided'
        }
      ]
    },
    'N': {
      type: 'Number',
      description: 'Numeric values with optional range constraints',
      params: [
        {
          name: 'min',
          type: 'number',
          description: 'Minimum allowed value'
        },
        {
          name: 'max',
          type: 'number',
          description: 'Maximum allowed value'
        },
        {
          name: 'integer',
          type: 'boolean',
          description: 'Whether the number must be an integer'
        },
        {
          name: 'optional',
          type: 'boolean',
          description: 'Whether the field is optional'
        },
        {
          name: 'values',
          type: 'number[]',
          description: 'Array of allowed values'
        },
        {
          name: 'default',
          type: 'number',
          description: 'Default value if field is not provided'
        }
      ]
    },
    'B': {
      type: 'Boolean',
      description: 'True/false values',
      params: [
        {
          name: 'optional',
          type: 'boolean',
          description: 'Whether the field is optional'
        },
        {
          name: 'default',
          type: 'boolean',
          description: 'Default value if field is not provided'
        }
      ]
    },
    'L': {
      type: 'Array',
      description: 'Array of values with type validation',
      params: [
        {
          name: 'items',
          type: 'ValidationRule | string',
          description: 'Validation rule for array items',
          required: true
        },
        {
          name: 'minLength',
          type: 'number',
          description: 'Minimum array length'
        },
        {
          name: 'maxLength',
          type: 'number',
          description: 'Maximum array length'
        },
        {
          name: 'optional',
          type: 'boolean',
          description: 'Whether the field is optional'
        }
      ]
    },
    'M': {
      type: 'Map',
      description: 'Object with defined field structure',
      params: [
        {
          name: 'fields',
          type: 'Record<string, ValidationRule | string>',
          description: 'Validation rules for object fields',
          required: true
        },
        {
          name: 'optional',
          type: 'boolean',
          description: 'Whether the field is optional'
        }
      ]
    },
    'EMAIL': {
      type: 'Email',
      description: 'Valid email address format',
      params: [
        {
          name: 'optional',
          type: 'boolean',
          description: 'Whether the field is optional'
        },
        {
          name: 'default',
          type: 'string',
          description: 'Default value if field is not provided'
        }
      ]
    },
    'URL': {
      type: 'URL',
      description: 'Valid URL format',
      params: [
        {
          name: 'optional',
          type: 'boolean',
          description: 'Whether the field is optional'
        },
        {
          name: 'default',
          type: 'string',
          description: 'Default value if field is not provided'
        }
      ]
    },
    'DATE': {
      type: 'Date',
      description: 'Valid date format',
      params: [
        {
          name: 'optional',
          type: 'boolean',
          description: 'Whether the field is optional'
        },
        {
          name: 'default',
          type: 'string',
          description: 'Default value if field is not provided'
        }
      ]
    },
    'PHONE': {
      type: 'Phone',
      description: 'Valid phone number format',
      params: [
        {
          name: 'optional',
          type: 'boolean',
          description: 'Whether the field is optional'
        },
        {
          name: 'default',
          type: 'string',
          description: 'Default value if field is not provided'
        }
      ]
    },
    'REGEX': {
      type: 'Regex',
      description: 'Custom pattern matching',
      params: [
        {
          name: 'pattern',
          type: 'string',
          description: 'Regular expression pattern',
          required: true
        },
        {
          name: 'optional',
          type: 'boolean',
          description: 'Whether the field is optional'
        }
      ]
    }
  };
  export interface ValidationDependency {
    field: string;
    condition: (value: any) => boolean;
    validate: (value: any, dependentValue: any, fullData?: any) => boolean;
    message: string;
    optional?: boolean;
  }

  export interface ValidationRule {
    // Basic properties
    type?: ValidationType;
    optional?: boolean;
    default?: any;
    message?: string;

    // String validations
    minLength?: number;
    maxLength?: number;
    pattern?: string;

    // Number validations
    min?: number;
    max?: number;
    integer?: boolean;
    decimal?: boolean;
    decimals?: number;

    // Array/Object validations
    items?: ValidationRule | string;
    fields?: { [key: string]: ValidationRule | string };
    values?: any[];

    // Dependencies
    dependsOn?: ValidationDependency | ValidationDependency[];

    // Custom validation
    validate?: (value: any) => boolean;
  }

  export interface ValidationModel {
    [key: string]: ValidationRule | string;
  }

  export interface ValidationError {
    field: string;
    message: string;
  }

  export interface ModelValidationResponse {
    isValid: boolean;
    errors: string[] | null;
  }

  export type ValidationResponse<T> =
    | { isValid: true; data: T } // Success case - return validated data directly
    | { isValid: false; errors: ValidationError[] } // Error case
    | null; // Add null as a possible response type

  export interface ModelVersion {
    version: number;
    model: string; // serialized model
    createdAt: Date;
  }

  // Storage interfaces
  export interface IModelStorage {
    storeModelVersion(modelName: string, model: string): Promise<void>;
    getLatestModelVersion(modelName: string): Promise<ModelVersion | null>;
    getModelVersion(
      modelName: string,
      version: number
    ): Promise<ModelVersion | null>;
    listModelVersions(modelName: string): Promise<ModelVersion[]>;
    insertModel(modelName: string, model: ValidationModel): Promise<void>;
    updateModel(modelName: string, model: ValidationModel): Promise<void>;
    getModel(modelName: string): Promise<string | null>;
  }

  export interface IModelCache {
    setModel(modelName: string, serializedModel: string): Promise<void>;
    getModel(modelName: string): Promise<string | null>;
    invalidateModel(modelName: string): Promise<void>;
    setModelWithVersion(
      modelName: string,
      serializedModel: string,
      version?: number
    ): Promise<void>;
  }
}

// Type guards
export function isValidationError<T>(
  response: PerfectValidator.ValidationResponse<T> | null
): response is { isValid: false; errors: PerfectValidator.ValidationError[] } {
  return (
    response !== null &&
    typeof response === 'object' &&
    'isValid' in response &&
    !response.isValid
  );
}
