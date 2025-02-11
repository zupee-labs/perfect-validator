import { PerfectValidator } from "../types";
import { validateDataModel } from "../validators";


export const deserializeFunction = (fnStr: string): Function => {
    try {
        // Remove 'function' keyword and name if present
        fnStr = fnStr.replace(/^function\s*[a-zA-Z0-9_]*\s*/, '');
        
        // Handle arrow functions
        if (fnStr.includes('=>')) {
            const arrowFnMatch = fnStr.match(/^\((.*?)\)\s*=>\s*(.*)$/);
            if (arrowFnMatch) {
                const [, params, body] = arrowFnMatch;
                // For single expression arrow functions
                if (!body.includes('{')) {
                    return new Function(...params.split(',').map(p => p.trim()), `return ${body.trim()};`);
                }
                // For multi-line arrow functions
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
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`Failed to deserialize function: ${error.message}`);
        }
        throw new Error('Failed to deserialize function: Unknown error');
    }
};

// Serialize validation model to string
export const serializeValidationModel = (model: PerfectValidator.ValidationModel): string => {
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
            const result: Record<string, any> = {};
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
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`Failed to serialize model: ${error.message}`);
        }
        throw new Error('Failed to serialize model: Unknown error');
    }
};
export const deserializeValidationModel = (serializedModel: string): PerfectValidator.ValidationModel => {
    function deserializeObject(obj: any): any {
        // Handle function objects
        if (obj && obj.__type === 'function' && obj.code) {
            try {
                const fn:Function = deserializeFunction(obj.original || obj.code);
                return fn;
            } catch (error: unknown) {
                if (error instanceof Error) {
                    console.error('Function deserialization error:', error);
                    throw error;
                }
                throw new Error('Unknown error during function deserialization');
            }
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => deserializeObject(item));
        }

        // Handle objects with dependsOn
        if (obj && typeof obj === 'object') {
            const result: Record<string, any> = {};
            
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
        
        // Validate the deserialized model
        const validation: PerfectValidator.ModelValidationResponse = validateDataModel(deserialized);
        if (!validation.isValid) {
            throw new Error(`Invalid model after deserialization: ${validation.errors?.join(', ')}`);
        }
        
        return deserialized;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`Failed to deserialize model: ${error.message}`);
        }
        throw new Error('Failed to deserialize model: Unknown error');
    }
};