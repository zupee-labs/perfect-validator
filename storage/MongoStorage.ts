import { Collection, Db } from 'mongodb';
import { IModelStorage } from '../interfaces/storage.interface';
import { ValidationModel, ModelVersion } from '../interfaces/validation.interface';

export class MongoStorage implements IModelStorage {
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
        await this.writeCollection.createIndex({ modelName: 1, version: -1 });
        await this.writeCollection.createIndex({ modelName: 1, version: 1 }, { unique: true });
    }

    public static getInstance(writeDb: Db, readDb: Db): MongoStorage {
        return new MongoStorage(writeDb, readDb)
    }

    async storeModelVersion(modelName: string, serializedModel: string): Promise<void> {
        // Get current latest version
        const latest = await this.getLatestModelVersion(modelName);
        const newVersion = latest ? latest.version + 1 : 1;

        const modelVersion: ModelVersion = {
            version: newVersion,
            model: serializedModel,
            createdAt: new Date()
        };

        await this.writeCollection.insertOne({
            modelName,
            ...modelVersion
        });
    }

    async getLatestModelVersion(modelName: string): Promise<ModelVersion | null> {
        const result = await this.readCollection
            .find({ modelName })
            .sort({ version: -1 })
            .limit(1)
            .toArray();

        if (!result.length) return null;

        const { version, model, createdAt } = result[0];
        return { version, model, createdAt };
    }

    async getModelVersion(modelName: string, version: number): Promise<ModelVersion | null> {
        const result = await this.readCollection.findOne({ modelName, version });
        if (!result) return null;

        const { model, createdAt } = result;
        return { version, model, createdAt };
    }

    async listModelVersions(modelName: string): Promise<ModelVersion[]> {
        const results = await this.readCollection
            .find({ modelName })
            .sort({ version: -1 })
            .toArray();

        return results.map(({ version, model, createdAt }) => ({
            version,
            model,
            createdAt
        }));
    }

    // Legacy methods
    async insertModel(modelName: string, model: ValidationModel): Promise<void> {
        const serialized = JSON.stringify(model);
        await this.storeModelVersion(modelName, serialized);
    }

    async updateModel(modelName: string, model: ValidationModel): Promise<void> {
        const serialized = JSON.stringify(model);
        await this.storeModelVersion(modelName, serialized);
    }

    async getModel(modelName: string): Promise<string | null> {
        const latest = await this.getLatestModelVersion(modelName);
        return latest ? latest.model : null;
    }
} 