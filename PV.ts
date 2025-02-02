import { 
    ValidationModel, 
    ValidationResponse, 
    ModelValidationResponse,
    ModelVersion,
    ValidationError,
    isValidationError
} from './interfaces/validation.interface'
import { IModelStorage } from './interfaces/storage.interface'
import { validateAgainstModel, validateDataModel } from './validators'

// Helper function to safely deserialize functions
export const deserializeFunction = (fnStr: string): Function => {
    try {
        // Remove any 'function' keyword if present and any name
        fnStr = fnStr.replace(/^function\s*[a-zA-Z0-9_]*\s*/, '');
        
        // Handle arrow functions
        if (fnStr.includes('=>')) {
            const arrowFnMatch = fnStr.match(/^\((.*?)\)\s*=>\s*(.*)$/);
            if (arrowFnMatch) {
                const [, params, body] = arrowFnMatch;
                // If body is a single expression (no curly braces)
                if (!body.includes('{')) {
                    return new Function(...params.split(',').map(p => p.trim()), `return ${body.trim()};`);
                }
                // If body has curly braces, remove them and any 'return' statement
                const cleanBody = body.replace(/^\{|\}$/g, '').trim();
                return new Function(...params.split(',').map(p => p.trim()), cleanBody);
            }
        }

        // Handle regular functions
        const regularFnMatch = fnStr.match(/^\((.*?)\)\s*\{([\s\S]*)\}$/);
        if (regularFnMatch) {
            const [, params, body] = regularFnMatch;
            return new Function(...params.split(',').map(p => p.trim()), body.trim());
        }

        throw new Error('Invalid function format');
    } catch (error) {
        throw new Error(`Failed to deserialize function: ${error.message}`);
    }
};

// Serialize validation model to string
export const serializeValidationModel = (model: ValidationModel): string => {
    function serializeObject(obj: any): any {
        // Handle functions
        if (typeof obj === 'function') {
            return {
                __type: 'function',
                code: obj.toString(),
                // Store original function string for better reconstruction
                original: obj.toString()
            };
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => serializeObject(item));
        }

        // Handle objects
        if (obj && typeof obj === 'object') {
            const result: any = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = serializeObject(value);
            }
            return result;
        }

        // Handle primitive values
        return obj;
    }

    try {
        return JSON.stringify(serializeObject(model));
    } catch (error) {
        throw new Error(`Failed to serialize model: ${error.message}`);
    }
};

// Deserialize string back to validation model
export const deserializeValidationModel = (serializedModel: string): ValidationModel => {
    function deserializeObject(obj: any): any {
        // Handle function objects
        if (obj && obj.__type === 'function' && obj.code) {
            try {
                console.log('Deserializing function:', obj.original || obj.code);
                const fn = deserializeFunction(obj.original || obj.code);
                console.log('Deserialized function:', fn.toString());
                return fn;
            } catch (error) {
                console.error('Function deserialization error:', error);
                throw error;
            }
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => deserializeObject(item));
        }

        // Handle objects with dependsOn
        if (obj && typeof obj === 'object') {
            const result: any = {};
            
            for (const [key, value] of Object.entries(obj)) {
                if (key === 'dependsOn') {
                    // Type guard for dependency object
                    const isDependencyObject = (v: any): v is { 
                        field: string; 
                        message: string; 
                        condition?: { __type: 'function'; code: string; original?: string };
                        validate?: { __type: 'function'; code: string; original?: string };
                    } => {
                        return typeof v === 'object' && v !== null && 'field' in v;
                    };

                    // Handle both single dependency and array of dependencies
                    if (Array.isArray(value)) {
                        result[key] = value.map(dep => {
                            if (!isDependencyObject(dep)) {
                                throw new Error('Invalid dependency object structure');
                            }
                            return {
                                field: dep.field,
                                message: dep.message,
                                condition: dep.condition ? deserializeObject(dep.condition) : undefined,
                                validate: dep.validate ? deserializeObject(dep.validate) : undefined
                            };
                        });
                    } else if (isDependencyObject(value)) {
                        result[key] = {
                            field: value.field,
                            message: value.message,
                            condition: value.condition ? deserializeObject(value.condition) : undefined,
                            validate: value.validate ? deserializeObject(value.validate) : undefined
                        };
                    } else {
                        throw new Error('Invalid dependency structure');
                    }
                } else {
                    result[key] = deserializeObject(value);
                }
            }
            return result;
        }

        return obj;
    }

    try {
        const parsed = JSON.parse(serializedModel);
        const deserialized = deserializeObject(parsed);
        
        // Add debug logs
        console.log('Parsed Model:', JSON.stringify(parsed, null, 2));
        console.log('Deserialized Model Structure:', JSON.stringify(deserialized, (key, value) => 
            typeof value === 'function' ? '[Function]' : value, 2));
        
        // Validate the deserialized model
        const validation = validateDataModel(deserialized);
        if (!validation.isValid) {
            console.error('Validation errors:', validation.errors);
            throw new Error(`Invalid model after deserialization: ${validation.errors?.join(', ')}`);
        }
        
        return deserialized;
    } catch (error) {
        console.error('Deserialization error:', error);
        throw new Error(`Failed to deserialize model: ${error.message}`);
    }
};

// Add validation for nested structures

export class PV {
    private storage: IModelStorage;
    private static instance: PV;

    constructor(storage: IModelStorage) {
        this.storage = storage;
    }

    /**
     * Static validation with direct model and data
     */
    public validateStatic<T>(data: T, model: ValidationModel): ValidationResponse<T> {
        // First validate the model itself
        const modelValidation = this.validateModel(model);
        if (!modelValidation.isValid) {
            return {
                isValid: false,
                errors: modelValidation.errors?.map(error => ({
                    field: 'model',
                    message: error
                }))
            };
        }

        // Then validate the data
        return validateAgainstModel(data, model);
    }

    public static getInstance(storage: IModelStorage): PV {
        if (!PV.instance) {
            try {
                PV.instance = new PV(storage)
            } catch (error) {
                throw new Error(`Failed to create PV instance: ${JSON.stringify(error.stack)}`)
            }
        }
        return PV.instance
    }

    /**
     * Dynamic validation using stored model
     */
    public async validateDynamic<T>(data: T, modelName: string): Promise<ValidationResponse<T>> {
        try {
            const model = await this.getLatestModelVersion(modelName);
            const validation: ValidationResponse<T> = validateAgainstModel(data, model);
           
            return validation;
        } catch (error) {
            return {
                isValid: false,
                errors: [{
                    field: 'model',
                    message: `Failed to load model: ${error.message}`
                }]
            };
        }
    }

    /**
     * Validate model structure
     */
    public validateModel(model: ValidationModel): ModelValidationResponse {
        return validateDataModel(model);
    }

    /**
     * Insert new model into storage
     */
    public async insertModel(modelName: string, model: ValidationModel): Promise<void> {
        // Validate model first
        const validation = this.validateModel(model);
        if (!validation.isValid) {
            throw new Error(`Invalid model: ${validation.errors?.join(', ')}`);
        }

        await this.storage.insertModel(modelName, model);
    }

    /**
     * Update existing model
     */
    public async updateModel(modelName: string, model: ValidationModel): Promise<void> {
        // Validate model first
        const validation = this.validateModel(model);
        if (!validation.isValid) {
            throw new Error(`Invalid model: ${validation.errors?.join(', ')}`);
        }

        await this.storage.updateModel(modelName, model);
    }

    /**
     * Store model with validation
     */
    public async storeModel(
        modelName: string, 
        model: ValidationModel, 
        testData?: any
    ): Promise<ModelValidationResponse> {
        try {
            // 1. Validate model structure
            const modelValidation = this.validateModel(model);
            if (!modelValidation.isValid) {
                return modelValidation;
            }

            // 2. Validate model functions
            const functionValidation = this.validateModelFunctions(model);
            if (!functionValidation.isValid) {
                return functionValidation;
            }

            // 3. Serialize with safety checks
            const serialized = await this.serializeModelSafely(model);

            // 4. Test deserialization
            const deserialized = await this.deserializeAndValidate(serialized);

            // 5. Test with sample data if provided
            if (testData) {
                const testValidation = validateAgainstModel(testData, deserialized);
                if (isValidationError(testValidation)) {
                    return {
                        isValid: false,
                        errors: testValidation.errors.map(e => e.message)
                    };
                }
            }

            // 6. Store model
            await this.storage.storeModelVersion(modelName, serialized);

            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                errors: [`Failed to store model: ${error.message}`]
            };
        }
    }

    private async getLatestModelVersion(modelName: string): Promise<ValidationModel> {
        const stored = await this.storage.getLatestModelVersion(modelName);
        if (!stored) {
            throw new Error(`Model ${modelName} not found`);
        }
        return this.deserializeAndValidate(stored.model);
    }

    private async serializeModelSafely(model: ValidationModel): Promise<string> {
        try {
            return serializeValidationModel(model);
        } catch (error) {
            throw new Error(`Model serialization failed: ${error.message}`);
        }
    }

    private async deserializeAndValidate(serialized: string): Promise<ValidationModel> {
        try {
            const model = deserializeValidationModel(serialized);
            const validation = validateDataModel(model);
            if (!validation.isValid) {
                throw new Error(`Invalid model after deserialization: ${validation.errors?.join(', ')}`);
            }
            return model;
        } catch (error) {
            throw new Error(`Model deserialization failed: ${error.message}`);
        }
    }

    private validateModelFunctions(model: ValidationModel): ModelValidationResponse {
        const errors: string[] = [];
        
        function validateFunctions(obj: any, path: string) {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'function') {
                    try {
                        // Test function with dummy values
                        value(1, 2, 3);
                    } catch (error) {
                        if (!(error instanceof TypeError)) {
                            errors.push(`Invalid function at ${path}.${key}: ${error.message}`);
                        }
                    }
                } else if (value && typeof value === 'object') {
                    validateFunctions(value, `${path}.${key}`);
                }
            }
        }

        validateFunctions(model, '');
        
        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    private async validateWithSafetyChecks(
        data: any, 
        model: ValidationModel
    ): Promise<ValidationResponse<any>> {
        try {
            const validation = validateAgainstModel(data, model);
            if (!validation.isValid) {
                return {
                    isValid: false,
                    errors: validation.errors
                };
            }
            return data;
        } catch (error) {
            return {
                isValid: false,
                errors: [{
                    field: 'validation',
                    message: `Validation failed: ${error.message}`
                }]
            };
        }
    }
}