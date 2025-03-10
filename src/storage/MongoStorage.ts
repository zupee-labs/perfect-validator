import { Db } from 'mongodb';
import { PerfectValidator } from '../types';
import { serializeValidationModel } from '../utils';

export class MongoStorage implements PerfectValidator.IModelStorage {
  private db: Db;
  private defaultCollection = 'validation_models';

  constructor(db: Db) {
    this.db = db;
  }

  private getCollection(collection?: string) {
    return this.db.collection(collection || this.defaultCollection);
  }

  async getModel(modelName: string): Promise<string | null> {
    const doc = await this.getCollection().findOne({
      name: modelName,
      isLatest: true,
    });
    return doc ? doc.model : null;
  }

  async storeModelVersion(
    modelName: string,
    serializedModel: string,
    version: number,
    collection?: string
  ): Promise<void> {
    const col = this.getCollection(collection);

    // Check if version exists
    const existingVersion = await col.findOne({
      name: modelName,
      version: version,
    });

    if (existingVersion) {
      throw new Error(
        `Version ${version} already exists for model ${modelName}`
      );
    }

    // Update and insert as before, but using the specified collection
    await col.updateMany({ name: modelName }, { $set: { isLatest: false } });

    await col.insertOne({
      name: modelName,
      version: version,
      model: serializedModel,
      createdAt: new Date(),
      isLatest: true,
    });
  }

  async getModelVersion(
    modelName: string,
    version: number,
    collection?: string
  ): Promise<PerfectValidator.ModelVersion | null> {
    const doc = await this.getCollection(collection).findOne({
      name: modelName,
      version: version,
    });

    if (!doc || !doc.model || Object.keys(doc.model).length === 0) return null;

    return {
      version: doc.version,
      model: doc.model,
      createdAt: doc.createdAt,
    };
  }

  async getLatestModelVersion(
    modelName: string,
    collection?: string
  ): Promise<PerfectValidator.ModelVersion | null> {
    const doc = await this.getCollection(collection).findOne({
      name: modelName,
      isLatest: true,
    });

    if (!doc || !doc.model || Object.keys(doc.model).length === 0) return null;

    return {
      version: doc.version,
      model: doc.model,
      createdAt: doc.createdAt,
    };
  }

  async listModelVersions(
    modelName: string,
    collection?: string
  ): Promise<number[]> {
    // Only project the needed fields (version and createdAt)
    const cursor = this.getCollection(collection)
      .find({ name: modelName }, { projection: { version: 1, createdAt: 1 } })
      .sort({ version: -1 });

    const versions: number[] = [];

    // Process documents one by one using cursor, not loading model data
    for await (const doc of cursor) {
      versions.push(doc.version);
    }

    return versions;
  }

  // These methods are now just aliases for versioned operations
  async insertModel(
    modelName: string,
    model: PerfectValidator.ValidationModel
  ): Promise<void> {
    const serializedModel = serializeValidationModel(model);
    await this.storeModelVersion(modelName, serializedModel, 1);
  }

  async updateModel(
    modelName: string,
    model: PerfectValidator.ValidationModel
  ): Promise<void> {
    const serializedModel = serializeValidationModel(model);
    const latestVersion = await this.getLatestModelVersion(modelName);
    const newVersion = latestVersion ? latestVersion.version + 1 : 1;
    await this.storeModelVersion(modelName, serializedModel, newVersion);
  }

  async deleteModel(modelName: string): Promise<void> {
    await this.getCollection().deleteMany({ name: modelName });
  }
}
