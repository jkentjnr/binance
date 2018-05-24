import { Validator as JsonValidator } from 'jsonschema';
import algorithmFactory from '../algorithms';
import providerFactory from '../providers';
import objectHelper from '../utils/objectHelper';
import get from 'lodash.get';
import set from 'lodash.set';

// Base Request Schema.
const requestSchema = {
    "id": "/Request",
    "type": "object",
    "properties": {
      "simulation": {"type": "boolean", "required": true},
      "campaign": {"type": "string"},
      "symbol": {"type": "string", "required": true},
      "bot": {"type": "array", "items": { "type": "string", "enum": algorithmFactory.getBotList() }, "required": true},
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
            const bots = algorithmFactory.getBotProcessor(message.bot);
            bots.forEach(botProcessor => botProcessor.addBotSchema(v, schema));
        }

        // Execute the request validation
        const baseResult = v.validate(message, requestSchema);

        if (baseResult.errors.length === 0 && botProcessor) {
            const dataProvider = await providerFactory.getDataProvider(message, log);
            
            // TODO: Throw on null provider.
            
            const validationResult = await botProcessor.validateData(message, log, dataProvider);
            errors.push(...validationResult);

            dataProvider.close(message);
        }
        
        errors.push(...baseResult.errors);

        return {
            valid: (errors.length === 0),
            errors
        };
    }

    async setDefaults(message, log) {

        // If a bot is present and valid, extend the schema for bot-specific request params 
        if (message.bot) {
            const bots = algorithmFactory.getBotProcessor(message.bot);
            bots.forEach(botProcessor => botProcessor.setDefaults(message, log));
        }

        // ----

        if (message.from) message.from = new Date(message.from);
        if (message.to) message.to = new Date(message.to);

        if (!message.name) {
            message.name = `${new Date().getTime()}_${message.bot.join('_')}`;
        }

        if (!get(message, 'execution.start')) {
            set(message, 'execution.start', new Date());
        }

        if (!message.log) {
            message.log = [];
        }

        if (!message.state) {
            message.state = {};
        }

		if (!message.state.orders) {
			message.state.orders = [];
		}

        if (!message.state.instruction) {
            message.state.instruction = {};
        }

        if (!message.history) {
            message.history = [];
        }

        if (!message.config) {
            message.config = {};
        }

        if (!message.config.txnFee) {
            message.config.txnFee = 0.005;
        }

    }
}

export default new Validator();