import { PV } from './PV';
import { PerfectValidator } from './types';
import { BaseStorage } from './storage/BaseStorage';
import { MongoStorage } from './storage/MongoStorage';
import { validateAgainstModel, validateDataModel } from './validators';
import { isValidationError } from './types';

// Create the default instance creator
const createPV = (storage: PerfectValidator.IModelStorage): PV => {
  return PV.getInstance(storage);
};

// Create a default export object for CommonJS compatibility
const defaultExport = {
  PV,
  createPV,
  BaseStorage,
  MongoStorage,
  validateAgainstModel,
  validateDataModel,
  isValidationError,
};

// Export everything individually for ESM
export { PV };
export { PerfectValidator, isValidationError } from './types';
export { BaseStorage } from './storage/BaseStorage';
export { MongoStorage } from './storage/MongoStorage';
export { validateAgainstModel, validateDataModel } from './validators';
export { createPV };

// Export default object for CommonJS require('perfect-validator')
export default defaultExport;
