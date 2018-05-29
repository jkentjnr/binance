import Validator from './validator';
import Recorder from './recorder';
import Evaluator from './evaluator';
import Trader from './trader';

class BotEngine {
    
	async execute(message, log) {

        // Validate
        const response = await new Validator.validate(message, log);
        if (response.valid === false) {
            console.log(response);
            return;
        }

        await Validator.setDefaults(message, log);

        await Recorder.setHeader(message, log);

        await Evaluator.evaluate(message, log);

        await Validator.finalise(message, log);

        await Recorder.setFooter(message, log);

    }
    
}

BotEngine.Validator = Validator;
BotEngine.Recorder = Recorder;
BotEngine.Evaluator = Evaluator;
BotEngine.Trader = Trader;

export default BotEngine;