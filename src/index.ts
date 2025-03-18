import { PV } from './PV';
import { PerfectValidator } from './types';

// Export the main PV class
export { PV };

// Export the PerfectValidator namespace and its types
export { PerfectValidator, isValidationError } from './types';

// Export storage implementations
export { BaseStorage } from './storage/BaseStorage';
export { MongoStorage } from './storage/MongoStorage';

// Export validators
export { validateAgainstModel, validateDataModel } from './validators';

// Export Serialization/Deserialization Functions
export { 
  serializeValidationModel, 
  deserializeValidationModel,
  getValidationTypeParams 
} from './utils';

// Export default instance creator
export const createPV = (storage: PerfectValidator.IModelStorage): PV => {
  return PV.getInstance(storage);
};
