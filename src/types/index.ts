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
  export interface ValidationDependency {
    field: string;
    condition: (value: any) => boolean;
    validate: (value: any, dependentValue: any, fullData?: any) => boolean;
    message: string;
    optional?: boolean;
    isRequired?: boolean;
  }
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
    model: string;
    createdAt: Date;
  }

  // Storage interfaces
  export interface IModelStorage {
    storeModelVersion(
      modelName: string,
      model: string,
      version: number,
      collection?: string
    ): Promise<void>;
    getLatestModelVersion(
      modelName: string,
      collection?: string
    ): Promise<ModelVersion | null>;
    getModelVersion(
      modelName: string,
      version: number,
      collection?: string
    ): Promise<ModelVersion | null>;
    listModelVersions(
      modelName: string,
      collection?: string
    ): Promise<number[]>;
    insertModel(
      modelName: string,
      model: ValidationModel,
      collection?: string
    ): Promise<void>;
    updateModel(
      modelName: string,
      model: ValidationModel,
      collection?: string
    ): Promise<void>;
    getModel(modelName: string, collection?: string): Promise<string | null>;
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
