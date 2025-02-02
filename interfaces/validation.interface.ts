export type ValidationType = 'S' | 'N' | 'B' | 'L' | 'M' | 'EMAIL' | 'URL' | 'DATE' | 'PHONE' | 'REGEX';

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

// For model validation
export interface ModelValidationResponse {
    isValid: boolean;
    errors?: string[];
}

// For data validation - returns either the validated data T or validation errors
export type ValidationResponse<T> = 
    | T  // Success case - return validated data directly
    | { isValid: false; errors: ValidationError[] };  // Error case

// Type guard to check if response is error
export function isValidationError<T>(
    response: ValidationResponse<T>
): response is { isValid: false; errors: ValidationError[] } {
    return typeof response === 'object' && 'isValid' in response && !response.isValid;
}

export interface ModelVersion {
    version: number;
    model: string; // serialized model
    createdAt: Date;
} 