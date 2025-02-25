import { PerfectValidator } from './types';
import { validateAgainstModel, validateDataModel } from './validators';

import {
  deserializeValidationModel,
  serializeValidationModel,
  getValidationTypeParams,
} from './utils';
import userProfileModel, { testCases } from './utils/model';
export class PV {
  private storage?: PerfectValidator.IModelStorage;
  private static instance: PV | null = null;

  constructor(storage?: PerfectValidator.IModelStorage) {
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

  public static getInstance(storage?: PerfectValidator.IModelStorage): PV {
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
   * Dynamic validation using stored model with optional collection
   */
  public async validateDynamic<T>(
    data: T,
    modelName: string,
    version?: number,
    collection?: string
  ): Promise<PerfectValidator.ValidationResponse<T>> {
    if (!this.storage) {
      throw new Error('Storage is required for dynamic validation');
    }

    try {
      let serializedModel: string | null;

      if (version !== undefined) {
        const modelVersion = await this.storage.getModelVersion(
          modelName,
          version,
          collection
        );
        if (!modelVersion) {
          throw new Error(`Model ${modelName} version ${version} not found`);
        }
        serializedModel = modelVersion.model;
      } else {
        const latestVersion = await this.storage.getLatestModelVersion(
          modelName,
          collection
        );
        if (!latestVersion) {
          throw new Error(`Model ${modelName} not found`);
        }
        serializedModel = latestVersion.model;
      }

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
   * Store model with validation and optional collection
   */
  public async storeModel(
    modelName: string,
    model: PerfectValidator.ValidationModel,
    version?: number,
    collection?: string
  ): Promise<PerfectValidator.ModelValidationResponse> {
    try {
      if (!this.storage) {
        throw new Error('Storage is required for model storage');
      }

      // Validate and store model with optional collection
      const modelValidation = this.validateModel(model);
      if (!modelValidation.isValid) {
        throw new Error(
          `Model validation failed: ${modelValidation.errors?.join(', ')}`
        );
      }

      const serialized = await this.serializeModelSafely(model);
      const deserialized = await this.deserializeAndValidate(serialized);

      if (version !== undefined) {
        await this.storage.storeModelVersion(
          modelName,
          serialized,
          version,
          collection
        );
      } else {
        const latestVersion = await this.storage.getLatestModelVersion(
          modelName,
          collection
        );
        const newVersion = latestVersion ? latestVersion.version + 1 : 1;
        await this.storage.storeModelVersion(
          modelName,
          serialized,
          newVersion,
          collection
        );
      }

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
  public getDataTypes(): Record<string, PerfectValidator.ValidationType> {
    return PerfectValidator.ValidationTypes;
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
  public getValidationTypeParams(
    type: PerfectValidator.ValidationType
  ): PerfectValidator.IValidationTypeParams {
    try {
      return getValidationTypeParams(type);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to get validation type params: ${error.message}`
        );
      }
      throw new Error('Failed to get validation type params: Unknown error');
    }
  }

  // Add new utility methods for version management
  public async getLatestModelVersion(
    modelName: string,
    collection?: string
  ): Promise<PerfectValidator.ValidationModel | null> {
    if (!this.storage) {
      throw new Error('Storage is required');
    }
    const latestVersion = await this.storage.getLatestModelVersion(
      modelName,
      collection
    );
    if (!latestVersion) {
      throw new Error(`Model ${modelName} not found`);
    }
    return deserializeValidationModel(latestVersion.model);
  }

  /**
   * Get model of a specific version
   * @param modelName Name of the model
   * @param version Version number of the model
   * @returns The model version or null if not found
   */
  public async getModelVersion(
    modelName: string,
    version: number,
    collection?: string
  ): Promise<PerfectValidator.ValidationModel | null> {
    if (!this.storage) {
      throw new Error('Storage is required');
    }

    try {
      const modelVersion: PerfectValidator.ModelVersion | null = await this.storage.getModelVersion(
        modelName,
        version,
        collection
      );

      if (!modelVersion) {
        throw new Error(`Model ${modelName} version ${version} not found`);
      }

      return deserializeValidationModel(modelVersion.model);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get model version: ${error.message}`);
      }
      throw new Error('Failed to get model version: Unknown error');
    }
  }
}
