import { ValidationModel, ModelVersion } from './validation.interface';

export interface IModelStorage {
    // Store new model version
    storeModelVersion(modelName: string, model: string): Promise<void>;
    
    // Get latest model version
    getLatestModelVersion(modelName: string): Promise<ModelVersion | null>;
    
    // Get specific model version
    getModelVersion(modelName: string, version: number): Promise<ModelVersion | null>;
    
    // List all versions of a model
    listModelVersions(modelName: string): Promise<ModelVersion[]>;
    
    // Legacy methods for backward compatibility
    insertModel(modelName: string, model: ValidationModel): Promise<void>;
    updateModel(modelName: string, model: ValidationModel): Promise<void>;
    getModel(modelName: string): Promise<string | null>;
}

export interface IModelCache {
    // Set model in cache
    setModel(modelName: string, serializedModel: string): Promise<void>;
    
    // Get model from cache
    getModel(modelName: string): Promise<string | null>;
    
    // Invalidate cached model
    invalidateModel(modelName: string): Promise<void>;
    
    // Set model with version
    setModelWithVersion(modelName: string, serializedModel: string, version?: number): Promise<void>;
} 