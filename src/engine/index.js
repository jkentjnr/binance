import Validator from './validator';
import Recorder from './recorder';

class BotEngine {
	async execute(message, log) {

        // Validate
        const response = await new Validator.validate(message, log);
        console.log(response);

        await Validator.setDefaults(message, log);

        await Recorder.setHeader(message, log);

    }   
}

BotEngine.Validator = Validator;
BotEngine.Recorder = Recorder;
export default BotEngine;