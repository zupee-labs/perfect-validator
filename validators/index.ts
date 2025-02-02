import { ValidationModel, ValidationResponse, ModelValidationResponse, ValidationRule, ValidationType, ValidationError, ValidationDependency } from '../interfaces/validation.interface';

// Constants
const VALID_TYPES = ['S', 'N', 'B', 'L', 'M', 'EMAIL', 'URL', 'DATE', 'PHONE', 'REGEX'] as const;

// Regex patterns
const PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
    PHONE: /^\+?[\d\s-]{10,}$/,
    DATE: /^\d{4}-\d{2}-\d{2}$/
} as const;

// Helper functions
function getNestedValue(obj: any, path: string): any {
    // Split path into parts, handling array notation
    const parts = path.split(/\.|\[|\]/).filter(Boolean);
    let current = obj;

    for (const part of parts) {
        if (!current) return undefined;
        
        // If it's a number, treat as array index
        if (/^\d+$/.test(part)) {
            current = current[parseInt(part, 10)];
        } else {
            current = current[part];
        }
    }

    return current;
}

function parseArrayType(type: string): { isArray: boolean; elementType: string } {
    if (type.startsWith('L<') && type.endsWith('>')) {
        return {
            isArray: true,
            elementType: type.slice(2, -1)
        };
    }
    return { isArray: false, elementType: type };
}

function isValidationRule(rule: ValidationRule | string): rule is ValidationRule {
    return typeof rule === 'object' && rule !== null;
}

function applyDefaults(data: any, model: ValidationModel): any {
    const result = { ...data };

    function getDefaultValue(rule: ValidationRule): any {
        if (rule.default !== undefined) {
            return typeof rule.default === 'function' 
                ? rule.default() 
                : JSON.parse(JSON.stringify(rule.default));
        }

        if (rule.type) {
            switch (rule.type) {
                case 'S': return '';
                case 'N': return 0;
                case 'B': return false;
                case 'L': return [];
                case 'M': return {};
                default: return undefined;
            }
        }
        return undefined;
    }

    Object.entries(model).forEach(([key, rule]) => {
        if (result[key] === undefined && isValidationRule(rule) && !rule.optional) {
            result[key] = getDefaultValue(rule);
        }
    });

    return result;
}

function validateType(value: any, type: ValidationType, rule?: ValidationRule): boolean {
    switch (type) {
        case 'S':
            return typeof value === 'string';
        case 'N':
            if (typeof value !== 'number' || isNaN(value)) return false;
            if (rule?.decimal) {
                const decimalPlaces = (value.toString().split('.')[1] || '').length;
                if (rule.decimals !== undefined && decimalPlaces !== rule.decimals) return false;
            }
            return true;
        case 'B':
            return typeof value === 'boolean';
        case 'L':
            return Array.isArray(value);
        case 'M':
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        case 'EMAIL':
            return typeof value === 'string' && PATTERNS.EMAIL.test(value);
        case 'URL':
            return typeof value === 'string' && PATTERNS.URL.test(value);
        case 'DATE':
            return typeof value === 'string' && PATTERNS.DATE.test(value);
        case 'PHONE':
            return typeof value === 'string' && PATTERNS.PHONE.test(value);
        case 'REGEX':
            return typeof value === 'string' && (rule?.pattern ? new RegExp(rule.pattern).test(value) : false);
        default:
            return false;
    }
}

function getTypeDescription(rule: ValidationRule | string): string {
    if (typeof rule === 'string') return rule;
    
    const type = rule.type;
    if (!type) return 'unknown';

    switch (type) {
        case 'S':
            return `string${rule.minLength ? ` (min length: ${rule.minLength})` : ''}${rule.maxLength ? ` (max length: ${rule.maxLength})` : ''}`;
        case 'N':
            return `number${rule.min !== undefined ? ` (min: ${rule.min})` : ''}${rule.max !== undefined ? ` (max: ${rule.max})` : ''}${rule.decimal ? ' (decimal)' : ''}`;
        case 'EMAIL':
            return 'email address';
        case 'URL':
            return 'URL';
        case 'DATE':
            return 'date (YYYY-MM-DD)';
        case 'PHONE':
            return 'phone number';
        case 'B':
            return 'boolean';
        case 'L':
            return `array${rule.items ? ` of ${getTypeDescription(rule.items)}` : ''}`;
        case 'REGEX':
            return `string matching pattern: ${rule.pattern}`;
        default:
            return type;
    }
}

export function validateDataModel(model: ValidationModel): ModelValidationResponse {
    const errors: string[] = [];

    function validateField(field: ValidationRule | string, path: string): void {
        // Handle simple string type
        if (typeof field === 'string') {
            if (!VALID_TYPES.includes(field as ValidationType)) {
                errors.push(`Invalid type "${field}" at ${path}`);
            }
            return;
        }

        // Must be an object if not a string
        if (typeof field !== 'object' || field === null) {
            errors.push(`Invalid field definition at ${path}`);
            return;
        }

        // Check for valid type if specified
        if (field.type && !VALID_TYPES.includes(field.type)) {
            errors.push(`Invalid type "${field.type}" at ${path}`);
        }

        // Validate values array if present
        if (field.values !== undefined) {
            if (!Array.isArray(field.values) || field.values.length === 0) {
                errors.push(`Invalid values at ${path}`);
            }
        }

        // Validate min/max for numbers
        if (field.type === 'N') {
            if (field.min !== undefined && typeof field.min !== 'number') {
                errors.push(`Invalid min value at ${path}`);
            }
            if (field.max !== undefined && typeof field.max !== 'number') {
                errors.push(`Invalid max value at ${path}`);
            }
            if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
                errors.push(`Invalid range at ${path}`);
            }
            if (field.integer !== undefined && typeof field.integer !== 'boolean') {
                errors.push(`Invalid integer flag at ${path}`);
            }
        }

        // Validate dependencies
        if (field.dependsOn) {
            const deps = Array.isArray(field.dependsOn) ? field.dependsOn : [field.dependsOn];
            deps.forEach((dep, index) => {
                const depPath = `${path}.dependsOn[${index}]`;
                if (typeof dep !== 'object' || dep === null) {
                    errors.push(`Invalid dependency definition at ${depPath}`);
                    return;
                }
                if (!dep.field) {
                    errors.push(`Missing field in dependency at ${depPath}`);
                }
                if (!dep.condition || typeof dep.condition !== 'function') {
                    errors.push(`Missing or invalid condition function at ${depPath}`);
                }
                if (!dep.validate || typeof dep.validate !== 'function') {
                    errors.push(`Missing or invalid validate function at ${depPath}`);
                }
            });
        }

        // Validate nested fields
        if (field.fields) {
            if (typeof field.fields !== 'object' || field.fields === null) {
                errors.push(`Invalid fields definition at ${path}`);
                return;
            }
            Object.entries(field.fields).forEach(([key, value]) => {
                validateField(value, path ? `${path}.${key}` : key);
            });
        }

        // Validate array items
        if (field.items) {
            validateField(field.items, `${path}.items`);
        }
    }

    // Validate each field in the model
    Object.entries(model).forEach(([key, field]) => {
        validateField(field, key);
    });

    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}

export function validateAgainstModel<T>(
    data: T, 
    model: ValidationModel, 
    parentPath = ''
): ValidationResponse<T> {
    const dataWithDefaults = applyDefaults(data, model);
    const errors: ValidationError[] = [];

    function validateValue(value: any, rule: ValidationRule | string, path: string): void {
        console.log('\nValidating path:', path);
        console.log('Value:', value);
        console.log('Rule:', JSON.stringify(rule, (key, val) => 
            typeof val === 'function' ? '[Function]' : val, 2));

        // Handle undefined for optional fields
        if (value === undefined) {
            if (typeof rule === 'object' && rule.optional) return;
            errors.push({
                field: path,
                message: 'Field is required'
            });
            return;
        }

        const typeIndicator = typeof rule === 'string' ? rule : rule.type;
        if (!typeIndicator) return;

        // Parse array type notation
        const { isArray, elementType } = parseArrayType(typeIndicator);
        if (isArray) {
            console.log('Validating array:', path);
            if (!Array.isArray(value)) {
                errors.push({
                    field: path,
                    message: `Expected array of ${elementType}, got ${typeof value}`
                });
                return;
            }
            value.forEach((item, index) => {
                validateValue(item, elementType, `${path}[${index}]`);
            });
            return;
        }

        // Type validation
        if (!validateType(value, typeIndicator as ValidationType, typeof rule === 'object' ? rule : undefined)) {
            errors.push({
                field: path,
                message: `Invalid type, expected ${getTypeDescription(rule)}, got ${typeof value}`
            });
            return;
        }

        if (typeof rule === 'string') return;

        // Validate constraints
        if (rule.values && !rule.values.includes(value)) {
            errors.push({
                field: path,
                message: `Value must be one of: ${rule.values.join(', ')}`
            });
        }

        // Number constraints
        if (rule.type === 'N') {
            if (rule.min !== undefined && value < rule.min) {
                errors.push({
                    field: path,
                    message: `Value must be >= ${rule.min}`
                });
            }
            if (rule.max !== undefined && value > rule.max) {
                errors.push({
                    field: path,
                    message: `Value must be <= ${rule.max}`
                });
            }
            if (rule.integer && !Number.isInteger(value)) {
                errors.push({
                    field: path,
                    message: 'Value must be an integer'
                });
            }
        }

        // String constraints
        if (rule.type === 'S') {
            if (rule.minLength !== undefined && value.length < rule.minLength) {
                errors.push({
                    field: path,
                    message: `String length must be >= ${rule.minLength}`
                });
            }
            if (rule.maxLength !== undefined && value.length > rule.maxLength) {
                errors.push({
                    field: path,
                    message: `String length must be <= ${rule.maxLength}`
                });
            }
        }

        // Handle array validation
        if (rule.items && Array.isArray(value)) {
            value.forEach((item, index) => {
                validateValue(item, rule.items!, `${path}[${index}]`);
            });
        }

        // Handle object validation
        if (rule.fields && typeof value === 'object') {
            Object.entries(rule.fields).forEach(([key, fieldRule]) => {
                validateValue(value[key], fieldRule, path ? `${path}.${key}` : key);
            });
        }

        // Dependencies validation
        if (typeof rule === 'object' && rule.dependsOn) {
            console.log('Validating dependencies for path:', path);
            const deps = Array.isArray(rule.dependsOn) ? rule.dependsOn : [rule.dependsOn];
            deps.forEach((dep, index) => {
                console.log(`\nChecking dependency ${index + 1}:`, dep);
                
                // Get the parent path (everything up to the last dot)
                const parentPath = path.substring(0, path.lastIndexOf('.'));
                const depPath = `${parentPath}.${dep.field}`;
                
                console.log('Parent path:', parentPath);
                console.log('Dependency path:', depPath);
                
                const depValue = getNestedValue(dataWithDefaults, depPath);
                console.log('Dependency value:', depValue);

                if (dep.condition(depValue)) {
                    console.log('Condition passed, validating...');
                    const isValid = dep.validate(value, depValue, dataWithDefaults);
                    console.log('Validation result:', isValid);
                    if (!isValid) {
                        errors.push({
                            field: path,
                            message: dep.message
                        });
                    }
                } else {
                    console.log('Condition not met, skipping validation');
                }
            });
        }
    }

    // Validate each field in the model
    Object.entries(model).forEach(([key, rule]) => {
        validateValue(
            key.includes('.') || key.includes('[]') 
                ? getNestedValue(dataWithDefaults, key)
                : dataWithDefaults[key],
            rule,
            parentPath ? `${parentPath}.${key}` : key
        );
    });

    // Log final validation result
    if (errors.length > 0) {
        console.log('\nValidation errors:', errors);
    } else {
        console.log('\nValidation successful');
    }

    return errors.length > 0 
        ? { isValid: false, errors } 
        : dataWithDefaults;
}

