import Validator from './validator';

class BotEngine {
	async execute(message) {

        // Validate
        const response = await new Validator.validate(message);
        console.log(response);

    }
}

BotEngine.Validator = Validator;
export default BotEngine;