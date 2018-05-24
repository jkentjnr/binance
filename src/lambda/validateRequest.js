import 'babel-polyfill';

import lambdaHelper from '../utils/lambdaHelper';
import colors from 'colors/safe';
import Engine from '../engine';
const { Validator } = Engine;

const config = {
    title: ' Validator ',
    color: colors.black.bgCyan
}

exports.handler = async (event, context, callback) => {
    await lambdaHelper.dataWrapper(config, event, context, callback, async (message, log) => {
        log.system.write('MESSAGE', JSON.stringify(message, null, 2));

        // Call validateRequest
        const response = await Validator.validate(message, log);

        message.step = {
            valid: response.valid,
            errors: response.errors
        };

        // -----

        await Validator.setDefaults(message, log);
        message.recorder = ['dataRecorder', 'consoleRecorder'];
        
        // -----

        return message;
    });
};