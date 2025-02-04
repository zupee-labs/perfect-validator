# Programmable Validator (PV)

A TypeScript-based validation library that supports both static and dynamic validation with serializable models.

## Features

- Static and dynamic validation
- Serializable validation models
- Function serialization/deserialization
- Dependency-based validation
- Model versioning
- Type-safe validation responses

## Discussion

### Why PV?

PV was created to solve common validation challenges in modern applications:

1. **Dynamic Validation Rules**
   - Rules that can change without code deployment
   - Support for complex business logic
   - Version control of validation rules

2. **Function Serialization**
   - Store and retrieve validation functions
   - Share validation logic across systems
   - Safe deserialization of functions

3. **Type Safety**
   - Built with TypeScript for better reliability
   - Compile-time type checking
   - IDE support and autocompletion

### Key Design Decisions

1. **Model Structure**
   ```typescript
   interface ValidationRule {
       type?: ValidationType;
       optional?: boolean;
       validate?: (value: any) => boolean;
       message?: string;
   }
   ```
   - Simple yet flexible validation rules
   - Support for custom validation functions
   - Clear error messaging

2. **Storage Interface**
   ```typescript
   interface IModelStorage {
       storeModelVersion(modelName: string, model: string): Promise<void>;
       getLatestModelVersion(modelName: string): Promise<ModelVersion | null>;
   }
   ```
   - Version control built-in
   - Async storage operations
   - Flexible storage implementation

3. **Validation Types**
   - String (`S`)
   - Number (`N`)
   - Boolean (`B`)
   - Email (`EMAIL`)
   - URL (`URL`)
   - Custom regex
   - And more...

### Common Use Cases

1. **Form Validation**
   ```typescript
   const formModel = {
       email: { type: 'EMAIL', message: 'Invalid email' },
       age: { type: 'N', min: 18, message: 'Must be 18+' }
   };
   ```

2. **API Validation**
   ```typescript
   const apiModel = {
       id: { type: 'S', pattern: '^[0-9a-f]{24}$' },
       data: { type: 'M', fields: { ... } }
   };
   ```

3. **Dependent Fields**
   ```typescript
   const passwordModel = {
       password: { type: 'S', minLength: 8 },
       confirm: {
           dependsOn: {
               field: 'password',
               validate: (confirm, pass) => confirm === pass,
               message: 'Passwords must match'
           }
       }
   };
   ```

## Dynamic Validation Examples

### 1. Basic Dynamic Validation

```typescript
// Store the validation model
const userModel = {
    username: {
        type: 'S',
        minLength: 3,
        maxLength: 20,
        pattern: '^[a-zA-Z0-9_]+$',
        message: 'Username must be 3-20 characters, alphanumeric with underscore'
    },
    email: { 
        type: 'EMAIL',
        message: 'Invalid email format'
    }
};

// Store model for later use
await validator.storeModel('userModel', userModel);

// Later, validate data using the stored model
const userData = {
    username: 'john_doe',
    email: 'john@example.com'
};

const result = await validator.validateDynamic(userData, 'userModel');
```

### 2. Complex Dynamic Validation with Dependencies

```typescript
const orderModel = {
    orderType: {
        type: 'S',
        values: ['standard', 'express', 'international'],
        message: 'Invalid order type'
    },
    shippingAddress: {
        type: 'M',
        fields: {
            country: { type: 'S' },
            zipCode: { type: 'S' }
        },
        dependsOn: {
            field: 'orderType',
            condition: (type) => type === 'international',
            validate: (address) => address.country && address.country.length === 2,
            message: 'International orders require a valid country code'
        }
    },
    insurance: {
        type: 'B',
        dependsOn: {
            field: 'orderType',
            condition: (type) => type === 'international',
            validate: (insurance) => insurance === true,
            message: 'Insurance is required for international orders'
        }
    }
};

// Store the model
await validator.storeModel('orderModel', orderModel);

// Later validate orders
const order1 = {
    orderType: 'international',
    shippingAddress: {
        country: 'US',
        zipCode: '12345'
    },
    insurance: true
};

const order2 = {
    orderType: 'standard',
    shippingAddress: {
        zipCode: '12345'
    },
    insurance: false
};

const result1 = await validator.validateDynamic(order1, 'orderModel'); // Valid
const result2 = await validator.validateDynamic(order2, 'orderModel'); // Valid
```

### 3. Versioned Model Validation

```typescript
// Version 1 of the model
const userModelV1 = {
    name: { type: 'S', minLength: 2 },
    age: { type: 'N', min: 18 }
};

// Version 2 adds email validation
const userModelV2 = {
    name: { type: 'S', minLength: 2 },
    age: { type: 'N', min: 18 },
    email: { type: 'EMAIL' }
};

// Store different versions
await validator.storeModel('userModel', userModelV1); // Version 1
await validator.storeModel('userModel', userModelV2); // Version 2

// Validate against latest version
const user = {
    name: 'John',
    age: 25,
    email: 'john@example.com'
};

const result = await validator.validateDynamic(user, 'userModel');
```

### 4. Custom Function Validation

```typescript
const customModel = {
    password: {
        type: 'S',
        validate: (value) => {
            // Custom password strength check
            const hasUpper = /[A-Z]/.test(value);
            const hasLower = /[a-z]/.test(value);
            const hasNumber = /[0-9]/.test(value);
            const hasSpecial = /[!@#$%^&*]/.test(value);
            return hasUpper && hasLower && hasNumber && hasSpecial;
        },
        message: 'Password must contain uppercase, lowercase, number and special character'
    }
};

// Store model with custom function
await validator.storeModel('passwordModel', customModel);

// Later validate passwords
const password1 = { password: 'Abc123!@#' };
const password2 = { password: 'weakpass' };

const result1 = await validator.validateDynamic(password1, 'passwordModel'); // Valid
const result2 = await validator.validateDynamic(password2, 'passwordModel'); // Invalid
```

## Project Structure 