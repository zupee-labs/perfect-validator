import { Collection, Db } from 'mongodb';
import { PerfectValidator } from '../types';

export class MongoStorage implements PerfectValidator.IModelStorage {
    private writeDb: Db;
    private readDb: Db;
    private writeCollection: Collection;
    private readCollection: Collection;
    private readonly COLLECTION_NAME = 'validationModels';

    constructor(writeDb: Db, readDb: Db) {
        this.writeDb = writeDb;
        this.readDb = readDb;
        this.writeCollection = writeDb.collection(this.COLLECTION_NAME);
        this.readCollection = readDb.collection(this.COLLECTION_NAME);
        this.initializeIndexes();
    }

    private async initializeIndexes(): Promise<void> {
        // Create unique index on modelName since we're only storing one version per model
        await this.writeCollection.createIndex({ modelName: 1 }, { unique: true });
    }

    public static getInstance(writeDb: Db, readDb: Db): MongoStorage {
        return new MongoStorage(writeDb, readDb);
    }

    async updateModel(modelName: string, model: PerfectValidator.ValidationModel): Promise<void> {
        const serializedModel = JSON.stringify(model);
        await this.writeCollection.updateOne(
            { modelName },
            { 
                $set: { 
                    modelName,
                    model: serializedModel,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
    }

    async getModel(modelName: string): Promise<string | null> {
        const result = await this.readCollection.findOne({ modelName });
        return result ? result.model : null;
    }

    async deleteModel(modelName: string): Promise<void> {
        await this.writeCollection.deleteOne({ modelName });
    }

    // Implementing required interface methods but they're not used anymore
    async storeModelVersion(): Promise<void> {
        throw new Error('Method not supported - versioning is disabled');
    }

    async getLatestModelVersion(): Promise<PerfectValidator.ModelVersion | null> {
        throw new Error('Method not supported - versioning is disabled');
    }

    async getModelVersion(): Promise<PerfectValidator.ModelVersion | null> {
        throw new Error('Method not supported - versioning is disabled');
    }

    async listModelVersions(): Promise<PerfectValidator.ModelVersion[]> {
        throw new Error('Method not supported - versioning is disabled');
    }

    async insertModel(modelName: string, model: PerfectValidator.ValidationModel): Promise<void> {
        // Redirect to updateModel since we're only maintaining one version
        return this.updateModel(modelName, model);
    }
} 