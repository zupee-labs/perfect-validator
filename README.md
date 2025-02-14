# The Perfect Validator (PV)

A TypeScript-based validation library that supports both static and dynamic validation with serializable models.

## Installation

```bash
npm install perfect-validator
```

## Usage

### Static Validation (Frontend/Backend)

```typescript
import { PV } from 'perfect-validator';

// Get validator instance without storage
const validator = PV.getInstance();

// Simple user profile model
const userModel = {
  name: {
    type: 'S',
    minLength: 2,
    maxLength: 50,
  },
  age: {
    type: 'N',
    min: 13,
    message: 'User must be at least 13 years old',
  },
  email: {
    type: 'EMAIL',
    message: 'Invalid email format',
  },
  preferences: {
    type: 'M',
    fields: {
      theme: {
        type: 'S',
        values: ['light', 'dark', 'system'],
        default: 'system',
      },
      notifications: {
        type: 'B',
        default: true,
      },
    },
  },
};

// Validate data
const userData = {
  name: 'John Doe',
  age: 25,
  email: 'john@example.com',
  preferences: {
    theme: 'dark',
    notifications: true,
  },
};

const result = validator.validateStatic(userData, userModel);
console.log(result); // { isValid: true, data: userData } || { isValid: false, errors: [] }
```

### Dynamic Validation (Backend with MongoDB)

```typescript
import { PV, MongoStorage } from 'perfect-validator';
import { MongoClient } from 'mongodb';

async function setupValidator() {
  // Connect to MongoDB
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('your_database');

  // Create storage instance
  const storage = new MongoStorage(db);

  // Get validator instance with storage
  const validator = PV.getInstance(storage);

  // Store model for later use
  await validator.storeModel('userProfile', userModel);

  // Later, validate data using stored model
  const result = await validator.validateDynamic(userData, 'userProfile');
  console.log(result); // { isValid: true, data: userData } || { isValid: false, errors: [] }
}
```

## Advanced Examples

### Dependent Field Validation

```typescript
const orderModel = {
  items: {
    type: 'L',
    items: {
      type: 'M',
      fields: {
        productId: { type: 'S' },
        quantity: { type: 'N', min: 1 },
      },
    },
  },
  shipping: {
    type: 'M',
    fields: {
      method: {
        type: 'S',
        values: ['standard', 'express'],
      },
      insurance: {
        type: 'B',
        dependsOn: {
          field: 'shipping.method',
          condition: method => method === 'express',
          validate: insurance => insurance === true,
          message: 'Insurance is required for express shipping',
        },
      },
    },
  },
};
```

### Custom Validation Functions

```typescript
const passwordModel = {
  password: {
    type: 'S',
    validate: value => {
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      return hasUpper && hasLower && hasNumber;
    },
    message: 'Password must contain uppercase, lowercase and number',
  },
};
```

## Supported Types

- `S` - String
- `N` - Number
- `B` - Boolean
- `L` - List/Array
- `M` - Map/Object
- `EMAIL` - Email
- `URL` - URL
- `DATE` - Date
- `PHONE` - Phone Number
- `REGEX` - Custom Regex Pattern

## Features

- ✅ Static validation (no storage required)
- ✅ Dynamic validation with MongoDB
- ✅ Type-safe validation responses
- ✅ Dependent field validation
- ✅ Custom validation functions
- ✅ Default values
- ✅ Optional fields
- ✅ Array validation
- ✅ Nested object validation

## Why PV?

PV was created to solve validation challenges in modern distributed applications:

### 1. Centralized Validation Rules

- Store validation rules in a central database
- Update rules without code deployment
- Share validation logic across multiple services
- Consistent validation across frontend and backend

### 2. Flexible Usage

- **Frontend**: Use static validation without database
- **Backend**: Use dynamic validation with database storage
- **Microservices**: Share validation rules across services
- **API Gateway**: Validate requests using stored rules

### 3. Advanced Features

- **Function Serialization**: Store and retrieve validation functions safely
- **Dependency Validation**: Complex business rules with field dependencies
- **Type Safety**: Built with TypeScript for better reliability
- **Default Values**: Automatic value initialization

### Example Use Cases

#### 1. Multi-Service Architecture

```typescript
// Service A: Stores the validation rules
await validator.storeModel('userProfile', userModel);

// Service B: Uses stored rules
const result = await validator.validateDynamic(userData, 'userProfile');
```

#### 2. Frontend-Backend Consistency

```typescript
// Backend: Store rules in DB
await validator.storeModel('registrationRules', regModel);

// Frontend: Use same rules statically
const result = validator.validateStatic(formData, regModel);
```

#### 3. Dynamic Rule Updates

```typescript
// Update rules without deployment
const updatedRules = {
  ...existingRules,
  age: { type: 'N', min: 16 }, // Changed age requirement
};
await validator.storeModel('userProfile', updatedRules);
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

Made with ❤️ by [Zupee](https://zupee.com)
