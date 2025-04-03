import { Db } from 'mongodb';
import { PerfectValidator } from '../types';
import { serializeValidationModel } from '../utils';

export class MongoStorage implements PerfectValidator.IModelStorage {
  private db: Db;
  private defaultCollection = 'validation_models';

  constructor(db: Db) {
    this.db = db;
    
    // Check for required indexes instead of creating them
    this.checkRequiredIndexes();
  }

  /**
   * Checks if any indexes exist on the collection beyond the default _id index
   * This allows index creation to be handled externally (e.g., by bash scripts)
   */
  private async checkRequiredIndexes(): Promise<void> {
    try {
      const collection = this.getCollection();

      const indexInfo = await collection.indexInformation();      
      // Count indexes - MongoDB always has at least the _id index
      const indexCount = Object.keys(indexInfo).length;
      
      // If only the default _id index exists
      if (indexCount <= 1) {
        console.warn('=================================================================');
        console.warn('WARNING: No custom indexes found on validation_models collection');
      }
    } catch (error) {
      console.error('Failed to check indexes:', error);
    } 
  }

  private getCollection(collection?: string) {
    return this.db.collection(collection || this.defaultCollection);
  }

  async getModel(modelName: string): Promise<string | null> {
    // Get the model with the highest version
    const doc = await this.getCollection()
      .findOne({ name: modelName }, { sort: { version: -1 } })
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

    // Insert the new version without isLatest flag
    await col.insertOne({
      name: modelName,
      version: version,
      model: serializedModel,
      createdAt: new Date(),
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
    // Create a cursor to find the model with the highest version number
    const cursor = this.getCollection(collection)
      .find({ name: modelName })
      .sort({ version: -1 })
      .limit(1);

    // Check if there are any results
    if (await cursor.hasNext()) {
      const doc = await cursor.next();

      if (doc && doc.model && Object.keys(doc.model).length > 0) {
        return {
          version: doc.version,
          model: doc.model,
          createdAt: doc.createdAt,
        };
      }
    }

    return null;
  }

  async listModelVersions(
    modelName: string,
    collection?: string
  ): Promise<number[]> {
    const cursor = this.getCollection(collection)
      .find({ name: modelName }, { projection: { version: 1 } })
      .sort({ version: -1 });

    const versions: number[] = [];

    // Use cursor.hasNext() for explicit cursor navigation
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
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
