import { PerfectValidator } from '../types';

export abstract class BaseStorage implements PerfectValidator.IModelStorage {
    abstract storeModelVersion(modelName: string, model: string): Promise<void>;
    abstract getLatestModelVersion(modelName: string): Promise<PerfectValidator.ModelVersion | null>;
    abstract getModelVersion(modelName: string, version: number): Promise<PerfectValidator.ModelVersion | null>;
    abstract listModelVersions(modelName: string): Promise<PerfectValidator.ModelVersion[]>;
    abstract insertModel(modelName: string, model: PerfectValidator.ValidationModel): Promise<void>;
    abstract updateModel(modelName: string, model: PerfectValidator.ValidationModel): Promise<void>;
    abstract deleteModel(modelName: string): Promise<void>;
    abstract getModel(modelName: string): Promise<string | null>;
} 