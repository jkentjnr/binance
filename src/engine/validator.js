import { Validator as JsonValidator } from 'jsonschema';
import algorithmFactory from '../algorithms';
import providerFactory from '../providers';
import objectHelper from '../utils/objectHelper';

// Base Request Schema.
const requestSchema = {
    "id": "/Request",
    "type": "object",
    "properties": {
      "simulation": {"type": "boolean", "required": true},
      "symbol": {"type": "string", "required": true},
      "bot": {"type": "string", "enum": algorithmFactory.getBotList(), "required": true},
      "period": {"type": "integer", "enum": [3600, 14400, 86400], "required": true},
      "from": {"type": "date-time", "required": true},
      "to": {"type": "date-time", "required": true},
      "data": {"type": "string", "enum": providerFactory.getDataProviderList(), "required": true},
    }
};

class Validator {
	async validate(message, log) {

        const errors = [];
        let botProcessor = null;

        // Generate a Validator and copy the request schema.
        const v = new JsonValidator();
        const schema = objectHelper.deepClone(requestSchema);

        // If a bot is present and valid, extend the schema for bot-specific request params 
        if (message.bot) {
            botProcessor = algorithmFactory.getBotProcessor(message.bot);
            if (botProcessor) {
                botProcessor.addBotSchema(v, schema);
            }
        }

        // Execute the request validation
        const baseResult = v.validate(message, requestSchema);

        if (baseResult.errors.length === 0 && botProcessor) {
            const dataProvider = await providerFactory.getDataProvider(message, log);
            
            // TODO: Throw on null provider.
            
            const validationResult = await botProcessor.validateData(message, log, dataProvider);
            errors.push(...validationResult);

            dataProvider.close();            
        }
        
        errors.push(...baseResult.errors);

        return {
            valid: (errors.length === 0),
            errors
        };
    }
}

export default new Validator();