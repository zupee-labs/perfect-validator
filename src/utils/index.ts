import { PerfectValidator } from "../types";
import { validateDataModel } from "../validators";


export const deserializeFunction = (fnStr: string | { code: string; original?: string }): Function => {
    try {
        // If input is an object (from MongoDB), use the code property
        const functionString = typeof fnStr === 'object' ? (fnStr.original || fnStr.code) : fnStr;

        console.log('\n=== Deserialize Function Start ===');
        console.log('Original string:', functionString);

        // Normalize whitespace and remove 'function' keyword if present
        let normalizedStr = functionString.trim().replace(/^function\s*[a-zA-Z0-9_]*\s*/, '');
        normalizedStr = normalizedStr.replace(/function anonymous/, '').replace(/\s+/g, ' ').trim();
        
        console.log('After normalization:', normalizedStr);

        if (normalizedStr.includes('=>')) {
            console.log('Detected arrow function');
            
            // Multi-line arrow with block
            const blockArrowMatch = normalizedStr.match(/^\s*\((.*?)\)\s*=>\s*\{([\s\S]*)\}\s*$/);
            if (blockArrowMatch) {
                console.log('Matched block arrow pattern');
                const [, params, body] = blockArrowMatch;
                console.log('Params:', params);
                console.log('Body:', body);
                return new Function(...params.split(',').map(p => p.trim()), body.trim());
            }

            // Single-line arrow with expression
            const simpleArrowMatch = normalizedStr.match(/^\s*\((.*?)\)\s*=>\s*(.+?)\s*$/);
            if (simpleArrowMatch) {
                console.log('Matched simple arrow pattern');
                const [, params, expression] = simpleArrowMatch;
                console.log('Params:', params);
                console.log('Expression:', expression);
                // Handle potential multi-line expressions without braces
                const cleanExpression = expression.includes('\n') 
                    ? expression.split('\n').map(line => line.trim()).join(' ')
                    : expression.trim();
                console.log('Clean expression:', cleanExpression);
                return new Function(...params.split(',').map(p => p.trim()), `return ${cleanExpression};`);
            }

            console.log('No arrow function pattern matched');
        }

        // Regular function (now without 'function' keyword)
        console.log('Trying regular function pattern');
        const regularFnMatch = normalizedStr.match(/^\s*\((.*?)\)\s*\{([\s\S]*)\}\s*$/);
        if (regularFnMatch) {
            console.log('Matched regular function pattern');
            const [, params, body] = regularFnMatch;
            console.log('Params:', params);
            console.log('Body:', body);
            return new Function(...params.split(',').map(p => p.trim()), body.trim());
        }

        console.log('No patterns matched');
        throw new Error('Invalid function format');
    } catch (error) {
        console.error('\n=== Function Deserialization Error ===');
        console.error('Input string:', fnStr    );
        console.error('Attempted patterns:');
        console.error('1. Block arrow: /^\\s*\\((.*?)\\)\\s*=>\\s*\\{([\\s\\S]*)\\}\\s*$/');
        console.error('2. Simple arrow: /^\\s*\\((.*?)\\)\\s*=>\\s*(.+?)\\s*$/');
        console.error('3. Regular function: /^\\s*\\((.*?)\\)\\s*\\{([\\s\\S]*)\\}\\s*$/');
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
            return serializeFunction(obj);
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
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to serialize model: ${error.message}`);
        }
        throw new Error('Failed to serialize model: Unknown error');
    }
};

function serializeFunction(fn: Function): any {
    return {
        __type: 'function',
        code: fn.toString().replace(/\n/g, ' ').trim(),  // Remove newlines
        original: fn.toString().replace(/\n/g, ' ').trim()  // Remove newlines
    };
}

export const deserializeValidationModel = (serializedModel: string): PerfectValidator.ValidationModel => {
    console.log('\n=== Starting Deserialization ===');
    // console.log('Serialized Model:', serializedModel);

    function deserializeObject(obj: any): any {
        console.log('\nDeserializing object:', JSON.stringify(obj, null, 2));

        if (obj && obj.__type === 'function' && obj.code) {
            console.log('Deserializing function:', obj.code);
            try {
                const fn = deserializeFunction(obj.original || obj.code);
                console.log('Function deserialized successfully');
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
        console.log('\nParsed JSON:', JSON.stringify(parsed, null, 2));
        
        const deserialized = deserializeObject(parsed);
        console.log('\nDeserialized Model:', JSON.stringify(deserialized, (key, val) => 
            typeof val === 'function' ? '[Function]' : val, 2));
        
        // Validate the deserialized model
        const validation: PerfectValidator.ModelValidationResponse = validateDataModel(deserialized);
        if (!validation.isValid) {
            throw new Error(`Invalid model after deserialization: ${validation.errors?.join(', ')}`);
        }
        
        return deserialized;
    } catch (error) {
        console.error('Deserialization error:', error);
        throw error;
    }
};