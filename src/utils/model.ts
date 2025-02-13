import { PerfectValidator } from '../types';

const userProfileModel: PerfectValidator.ValidationModel = {
  user: {
    type: 'M',
    fields: {
      name: { type: 'S', minLength: 2 },
      age: { type: 'N', min: 13 },
      email: { type: 'EMAIL' },
      subscription: {
        type: 'M',
        fields: {
          plan: {
            type: 'S',
            values: ['FREE', 'BASIC', 'PREMIUM'],
            dependsOn: {
              field: 'user.age', // Cross-object reference
              condition: (age: number) => age < 18,
              validate: (plan: string) => plan !== 'PREMIUM',
              message: 'Users under 18 cannot have PREMIUM plan',
            },
          },
          features: {
            type: 'L',
            items: { type: 'S' },
            dependsOn: {
              field: 'user.subscription.plan', // Nested cross-object reference
              condition: (plan: string) => plan === 'FREE',
              validate: (features: string[]) => features.length <= 3,
              message: 'FREE plan can only have up to 3 features',
            },
          },

          // Payment method with multiple dependencies
          paymentMethod: {
            type: 'S',
            values: ['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL'],
            dependsOn: [
              {
                field: 'user.age',
                condition: (age: number) => age < 18,
                validate: (method: string) => method === 'DEBIT_CARD',
                message: 'Users under 18 can only use debit cards',
              },
              {
                field: 'user.subscription.plan',
                condition: (plan: string) => plan === 'PREMIUM',
                validate: (method: string) => method === 'CREDIT_CARD',
                message: 'PREMIUM plan requires credit card payment',
              },
            ],
          },
        },
      },
    },
  },
};

export default userProfileModel;
export const testCases: Array<{ name: string; data: any }> = [
  {
    name: 'Valid adult premium user',
    data: {
      user: {
        name: 'John Doe',
        age: 25,
        email: 'john@example.com',
        subscription: {
          plan: 'PREMIUM',
          features: ['feature1', 'feature2', 'feature3', 'feature4'],
          paymentMethod: 'CREDIT_CARD',
        },
      },
    },
  },
  {
    name: 'Valid teen user with free plan',
    data: {
      user: {
        name: 'Teen User',
        age: 15,
        email: 'teen@example.com',
        subscription: {
          plan: 'FREE',
          features: ['feature1', 'feature2'],
          paymentMethod: 'DEBIT_CARD',
        },
      },
    },
  },
  {
    name: 'Invalid - Teen trying premium plan',
    data: {
      user: {
        name: 'Teen Premium',
        age: 16,
        email: 'teen.premium@example.com',
        subscription: {
          plan: 'PREMIUM',
          features: ['feature1', 'feature2'],
          paymentMethod: 'DEBIT_CARD',
        },
      },
    },
  },
  {
    name: 'Invalid - Free plan with too many features',
    data: {
      user: {
        name: 'Free User',
        age: 20,
        email: 'free@example.com',
        subscription: {
          plan: 'FREE',
          features: ['feature1', 'feature2', 'feature3', 'feature4'],
          paymentMethod: 'PAYPAL',
        },
      },
    },
  },
];
