import { Db } from 'mongodb';
import { PerfectValidator } from '../types';
import { serializeValidationModel } from '../utils';

export class MongoStorage implements PerfectValidator.IModelStorage {
  private db: Db;
  private defaultCollection = 'validation_models';

  constructor(db: Db) {
    this.db = db;

    // Create indexes for better query performance
    this.createIndexes().catch(err => {
      console.error('Failed to create indexes:', err);
    });
  }

  /**
   * Create necessary indexes for optimal query performance
   */
  private async createIndexes(): Promise<void> {
    try {
      // Create a compound index - safe even if it already exists
      await this.getCollection().createIndex(
        { name: 1, version: -1 },
        { background: true }
      );
      
      // Create a simple index - safe even if it already exists
      await this.getCollection().createIndex(
        { name: 1 },
        { background: true }
      );
      
      console.log('Indexes created or already exist');
    } catch (error) {
      // Handle specific index errors if needed
      console.error('Error creating indexes:', error);
      // But don't rethrow - we want app to continue if index creation fails
    }
  }

  private getCollection(collection?: string) {
    return this.db.collection(collection || this.defaultCollection);
  }

  async getModel(modelName: string): Promise<string | null> {
    // Get the model with the highest version
    const doc = await this.getCollection()
      .find({ name: modelName })
      .sort({ version: -1 })
      .limit(1)
      .next();

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
