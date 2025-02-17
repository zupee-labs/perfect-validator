import { PerfectValidator } from '../types';
import { validateDataModel } from '../validators';

export const deserializeFunction = (
  fnStr: string | { code: string; original?: string }
): Function => {
  try {
    const functionString =
      typeof fnStr === 'object' ? fnStr.original || fnStr.code : fnStr;

    // Normalize whitespace and remove 'function' keyword if present
    let normalizedStr = functionString
      .trim()
      .replace(/^function\s*[a-zA-Z0-9_]*\s*/, '');
    normalizedStr = normalizedStr
      .replace(/function anonymous/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalizedStr.includes('=>')) {
      // Multi-line arrow with block
      const blockArrowMatch = normalizedStr.match(
        /^\s*(?:\((.*?)\)|([^=>\s]+))\s*=>\s*\{([\s\S]*)\}\s*$/
      );
      if (blockArrowMatch) {
        const [, paramsWithParens, singleParam, body] = blockArrowMatch;
        const params = paramsWithParens || singleParam;
        return new Function(
          ...params.split(',').map(p => p.trim()),
          body.trim()
        );
      }

      // Single-line arrow with expression
      const simpleArrowMatch = normalizedStr.match(
        /^\s*(?:\((.*?)\)|([^=>\s]+))\s*=>\s*(.+?)\s*$/
      );
      if (simpleArrowMatch) {
        const [, paramsWithParens, singleParam, expression] = simpleArrowMatch;
        const params = paramsWithParens || singleParam;
        // Handle potential multi-line expressions without braces
        const cleanExpression = expression.includes('\n')
          ? expression
              .split('\n')
              .map(line => line.trim())
              .join(' ')
          : expression.trim();
        return new Function(
          ...params.split(',').map(p => p.trim()),
          `return ${cleanExpression};`
        );
      }
    }

    // Regular function (now without 'function' keyword)
    const regularFnMatch = normalizedStr.match(
      /^\s*\((.*?)\)\s*\{([\s\S]*)\}\s*$/
    );
    if (regularFnMatch) {
      const [, params, body] = regularFnMatch;
      return new Function(...params.split(',').map(p => p.trim()), body.trim());
    }

    throw new Error('Invalid function format');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to deserialize function: ${error.message}`);
    }
    throw new Error('Failed to deserialize function: Unknown error');
  }
};

// Serialize validation model to string
export const serializeValidationModel = (
  model: PerfectValidator.ValidationModel
): string => {
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
    code: fn
      .toString()
      .replace(/\n/g, ' ')
      .trim(), // Remove newlines
    original: fn
      .toString()
      .replace(/\n/g, ' ')
      .trim(), // Remove newlines
  };
}

export const deserializeValidationModel = (
  serializedModel: string
): PerfectValidator.ValidationModel => {
  function deserializeObject(obj: any): any {
    if (obj && obj.__type === 'function' && obj.code) {
      try {
        const fn: Function = deserializeFunction(obj.original || obj.code);
        return fn;
      } catch (error) {
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
          const isDependencyObject = (
            v: any
          ): v is {
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
                condition: dep.condition
                  ? deserializeObject(dep.condition)
                  : undefined,
                validate: dep.validate
                  ? deserializeObject(dep.validate)
                  : undefined,
              };
            });
          } else if (isDependencyObject(value)) {
            result[key] = {
              field: value.field,
              message: value.message,
              condition: value.condition
                ? deserializeObject(value.condition)
                : undefined,
              validate: value.validate
                ? deserializeObject(value.validate)
                : undefined,
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
    const validation: PerfectValidator.ModelValidationResponse = validateDataModel(
      deserialized
    );
    if (!validation.isValid) {
      throw new Error(
        `Invalid model after deserialization: ${validation.errors?.join(', ')}`
      );
    }

    return deserialized;
  } catch (error) {
    throw error;
  }
};

export function getValidationTypeParams(type: PerfectValidator.ValidationType): PerfectValidator.IValidationTypeParams {
  const params: PerfectValidator.IValidationTypeParams = PerfectValidator.ValidationTypeParams[type];
  if (!params || params === undefined|| params === null) {
    throw new Error(`Invalid validation type: ${type}`);
  }
  return params;
}
