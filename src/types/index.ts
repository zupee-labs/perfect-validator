export namespace PerfectValidator {
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

    export interface ModelValidationResponse {
        isValid: boolean;
        errors: string[] | null;
    }

    export type ValidationResponse<T> = 
        | T  // Success case - return validated data directly
        | { isValid: false; errors: ValidationError[] }  // Error case
        | null;  // Add null as a possible response type

    export interface ModelVersion {
        version: number;
        model: string; // serialized model
        createdAt: Date;
    }

    // Storage interfaces
    export interface IModelStorage {
        storeModelVersion(modelName: string, model: string): Promise<void>;
        getLatestModelVersion(modelName: string): Promise<ModelVersion | null>;
        getModelVersion(modelName: string, version: number): Promise<ModelVersion | null>;
        listModelVersions(modelName: string): Promise<ModelVersion[]>;
        insertModel(modelName: string, model: ValidationModel): Promise<void>;
        updateModel(modelName: string, model: ValidationModel): Promise<void>;
        getModel(modelName: string): Promise<string | null>;
    }

    export interface IModelCache {
        setModel(modelName: string, serializedModel: string): Promise<void>;
        getModel(modelName: string): Promise<string | null>;
        invalidateModel(modelName: string): Promise<void>;
        setModelWithVersion(modelName: string, serializedModel: string, version?: number): Promise<void>;
    }
}

// Type guards
export function isValidationError<T>(
    response: PerfectValidator.ValidationResponse<T> | null
): response is { isValid: false; errors: PerfectValidator.ValidationError[] } {
    return response !== null && 
           typeof response === 'object' && 
           'isValid' in response && 
           !response.isValid;
} 