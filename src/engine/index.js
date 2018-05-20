import Validator from './validator';
import Recorder from './recorder';
import Evaluator from './evaluator';

class BotEngine {
	async execute(message, log) {

        // Validate
        const response = await new Validator.validate(message, log);
        if (response.valid === false) return;

        await Validator.setDefaults(message, log);

        await Recorder.setHeader(message, log);

        await Evaluator.evaluate(message, log);

    }   
}

BotEngine.Validator = Validator;
BotEngine.Recorder = Recorder;
BotEngine.Evaluator = Evaluator;

export default BotEngine;