import { Collection, Db } from 'mongodb';
import { PerfectValidator } from '../types';
import { serializeValidationModel } from '../utils';

export class MongoStorage implements PerfectValidator.IModelStorage {
  private collection: Collection;

  constructor(db: Db) {
    // Collection to store validation models
    this.collection = db.collection('validation_models');
  }

  async getModel(modelName: string): Promise<string | null> {
    const doc = await this.collection.findOne({ name: modelName });
    return doc ? doc.model : null;
  }

  async insertModel(
    modelName: string,
    model: PerfectValidator.ValidationModel
  ): Promise<void> {
    // Store the raw serialized model without parsing
    const serializedModel = JSON.stringify(model);
    await this.collection.insertOne({
      name: modelName,
      model: serializedModel, // Store raw string
      createdAt: new Date(),
    });
  }

  async updateModel(
    modelName: string,
    model: PerfectValidator.ValidationModel
  ): Promise<void> {
    // Always serialize before storing

    const serializedModel: string = serializeValidationModel(model);
    await this.collection.updateOne(
      { name: modelName },
      {
        $set: {
          model: serializedModel,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  async deleteModel(modelName: string): Promise<void> {
    await this.collection.deleteOne({ name: modelName });
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
}
