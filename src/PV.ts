import { PerfectValidator } from './types';
import { validateAgainstModel, validateDataModel } from './validators';
import { deserializeValidationModel, serializeValidationModel } from './utils';
import userProfileModel, { testCases } from './utils/model';
export class PV {
  private storage: PerfectValidator.IModelStorage;
  private static instance: PV | null = null;

  constructor(storage: PerfectValidator.IModelStorage) {
    this.storage = storage;
  }

  /**
   * Static validation with direct model and data
   */
  public validateStatic<T>(
    data: T,
    model: PerfectValidator.ValidationModel
  ): PerfectValidator.ValidationResponse<T> {
    const modelValidation: PerfectValidator.ModelValidationResponse = this.validateModel(
      model
    );
    if (!modelValidation.isValid && modelValidation.errors) {
      return {
        isValid: false,
        errors: modelValidation.errors.map(error => ({
          field: 'model',
          message: error,
        })) as PerfectValidator.ValidationError[],
      };
    }
    return validateAgainstModel(data, model);
  }

  public static getInstance(storage: PerfectValidator.IModelStorage): PV {
    if (!PV.instance) {
      try {
        PV.instance = new PV(storage);
      } catch (error) {
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
  public async validateDynamic<T>(
    data: T,
    modelName: string
  ): Promise<PerfectValidator.ValidationResponse<T>> {
    try {
      const serializedModel: string | null = await this.storage.getModel(
        modelName
      );
      if (!serializedModel) {
        throw new Error(`Model ${modelName} not found`);
      }
      const model: PerfectValidator.ValidationModel = deserializeValidationModel(
        serializedModel
      );
      return validateAgainstModel(data, model);
    } catch (error) {
      if (error instanceof Error) {
        return {
          isValid: false,
          errors: [
            {
              field: 'model',
              message: `Failed to load model: ${error.message}`,
            },
          ],
        };
      }
      return {
        isValid: false,
        errors: [
          {
            field: 'model',
            message: 'Failed to load model: Unknown error',
          },
        ],
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
      const modelValidation: PerfectValidator.ModelValidationResponse = this.validateModel(
        model
      );

      if (!modelValidation.isValid) {
        throw new Error(
          `Model validation failed: ${modelValidation.errors?.join(', ') ||
            'Unknown error'}`
        );
      }

      // 2. Serialize with safety checks
      const serialized: string = await this.serializeModelSafely(model);

      // 3. Test deserialization
      const deserialized: PerfectValidator.ValidationModel = await this.deserializeAndValidate(
        serialized
      );

      // 4. Store model (overwrite existing)
      await this.storage.updateModel(modelName, deserialized);

      return { isValid: true, errors: null };
    } catch (error) {
      if (error instanceof Error) {
        return {
          isValid: false,
          errors: [`Failed to store model: ${error.message}`],
        };
      }
      return {
        isValid: false,
        errors: ['Failed to store model: Unknown error'],
      };
    }
  }

  /**
   * Validate model structure
   */
  public validateModel(
    model: PerfectValidator.ValidationModel
  ): PerfectValidator.ModelValidationResponse {
    return validateDataModel(model);
  }

  private async serializeModelSafely(
    model: PerfectValidator.ValidationModel
  ): Promise<string> {
    try {
      return serializeValidationModel(model);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Model serialization failed: ${error.message}`);
      }
      throw new Error('Model serialization failed: Unknown error');
    }
  }

  private async deserializeAndValidate(
    serialized: string
  ): Promise<PerfectValidator.ValidationModel> {
    try {
      const model: PerfectValidator.ValidationModel = deserializeValidationModel(
        serialized
      );
      const validation: PerfectValidator.ModelValidationResponse = validateDataModel(
        model
      );
      if (!validation.isValid) {
        throw new Error(
          `Invalid model after deserialization: ${validation.errors?.join(
            ', '
          ) || 'Unknown error'}`
        );
      }
      return model;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Model deserialization failed: ${error.message}`);
      }
      throw new Error('Model deserialization failed: Unknown error');
    }
  }

  /**
   * Get all supported data types with descriptions
   */
  public getDataTypes(): Record<PerfectValidator.ValidationType, string> {
    return PerfectValidator.DataTypeDescriptions;
  }

  /**
   * Get example model with different validation cases
   */
  public getModelExample(): PerfectValidator.ValidationModel {
    return userProfileModel;
  }

  /**
   * Get example data matching the model example
   */
  public getDataExample(): Array<{ name: string; data: any }> {
    return testCases;
  }
}
