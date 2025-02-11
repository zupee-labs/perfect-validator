import { PerfectValidator, isValidationError } from './types';
import { validateAgainstModel, validateDataModel } from './validators';
import { deserializeValidationModel, serializeValidationModel } from './utils';

export class PV {
    private storage: PerfectValidator.IModelStorage;
    private static instance: PV | null = null;

    constructor(storage: PerfectValidator.IModelStorage) {
        this.storage = storage;
    }

    /**
     * Static validation with direct model and data
     */
    public validateStatic<T>(data: T, model: PerfectValidator.ValidationModel): PerfectValidator.ValidationResponse<T> {
        const modelValidation: PerfectValidator.ModelValidationResponse = this.validateModel(model);
        if (!modelValidation.isValid && modelValidation.errors) {
            return {
                isValid: false,
                errors: modelValidation.errors.map(error => ({
                    field: 'model',
                    message: error
                })) as PerfectValidator.ValidationError[]
            };
        }
        return validateAgainstModel(data, model);
    }

    public static getInstance(storage: PerfectValidator.IModelStorage): PV {
        if (!PV.instance) {
            try {
                PV.instance = new PV(storage);
            } catch (error: unknown) {
                if (error instanceof Error) {
                    throw new Error(`Failed to create PV instance: ${error.message}`);
                }
                throw new Error('Failed to create PV instance: Unknown error');
            }
        }
        return PV.instance;
    }

    /**
     * Dynamic validation using stored model
     */
    public async validateDynamic<T>(data: T, modelName: string): Promise<PerfectValidator.ValidationResponse<T>> {
        try {
            const serializedModel: string | null = await this.storage.getModel(modelName);
            if (!serializedModel) {
                throw new Error(`Model ${modelName} not found`);
            }
            const model: PerfectValidator.ValidationModel = deserializeValidationModel(serializedModel);
            return validateAgainstModel(data, model);
        } catch (error: unknown) {
            if (error instanceof Error) {
                return {
                    isValid: false,
                    errors: [{
                        field: 'model',
                        message: `Failed to load model: ${error.message}`
                    }]
                };
            }
            return {
                isValid: false,
                errors: [{
                    field: 'model',
                    message: 'Failed to load model: Unknown error'
                }]
            };
        }
    }

    /**
     * Store model with validation
     */
    public async storeModel(
        modelName: string, 
        model: PerfectValidator.ValidationModel, 
        testData?: any
    ): Promise<PerfectValidator.ModelValidationResponse> {
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
                if (testValidation !== null && isValidationError(testValidation)) {
                    return {
                        isValid: false,
                        errors: testValidation.errors.map((e: PerfectValidator.ValidationError) => e.message)
                    };
                }
            }

            // 6. Store model (overwrite existing)
            await this.storage.updateModel(modelName, model);

            return { isValid: true, errors: null };
        } catch (error: unknown) {
            if (error instanceof Error) {
                return {
                    isValid: false,
                    errors: [`Failed to store model: ${error.message}`]
                };
            }
            return {
                isValid: false,
                errors: ['Failed to store model: Unknown error']
            };
        }
    }

    /**
     * Validate model structure
     */
    public validateModel(model: PerfectValidator.ValidationModel): PerfectValidator.ModelValidationResponse {
        return validateDataModel(model);
    }

    private async serializeModelSafely(model: PerfectValidator.ValidationModel): Promise<string> {
        try {
            return serializeValidationModel(model);
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Model serialization failed: ${error.message}`);
            }
            throw new Error('Model serialization failed: Unknown error');
        }
    }

    private async deserializeAndValidate(serialized: string): Promise<PerfectValidator.ValidationModel> {
        try {
            const model = deserializeValidationModel(serialized);
            const validation = validateDataModel(model);
            if (!validation.isValid) {
                throw new Error(`Invalid model after deserialization: ${validation.errors?.join(', ') || 'Unknown error'}`);
            }
            return model;
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Model deserialization failed: ${error.message}`);
            }
            throw new Error('Model deserialization failed: Unknown error');
        }
    }

    private validateModelFunctions(model: PerfectValidator.ValidationModel): PerfectValidator.ModelValidationResponse {
        const errors: string[] = [];
        
        function validateFunctions(obj: any, path: string): void {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'function') {
                    try {
                        value(1, 2, 3);
                    } catch (error: unknown) {
                        if (!(error instanceof TypeError)) {
                            if (error instanceof Error) {
                                errors.push(`Invalid function at ${path}.${key}: ${error.message}`);
                            } else {
                                errors.push(`Invalid function at ${path}.${key}: Unknown error`);
                            }
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
            errors: errors.length > 0 ? errors : null
        };
    }
}