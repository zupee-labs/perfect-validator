import { IModelStorage } from '../interfaces/storage.interface';
import { ModelVersion, ValidationModel } from '../interfaces/validation.interface';

export abstract class BaseStorage implements IModelStorage {
    abstract storeModelVersion(modelName: string, model: string): Promise<void>;
    abstract getLatestModelVersion(modelName: string): Promise<ModelVersion | null>;
    abstract getModelVersion(modelName: string, version: number): Promise<ModelVersion | null>;
    abstract listModelVersions(modelName: string): Promise<ModelVersion[]>;
    abstract insertModel(modelName: string, model: ValidationModel): Promise<void>;
    abstract updateModel(modelName: string, model: ValidationModel): Promise<void>;
    abstract deleteModel(modelName: string): Promise<void>;
    abstract getModel(modelName: string): Promise<string | null>;
} 