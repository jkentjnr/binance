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

        if (!message.recorder) {
            message.recorder = ['dataRecorder', 'consoleRecorder', 'logToS3Recorder', 'csvToS3Recorder'];
        }

        // Call validateRequest
        const response = await Validator.validate(message, log);

        message.step = {
            valid: response.valid,
            errors: response.errors
        };

        // -----

        // Defaults the message appropriately and extends it to support a wider array of outputs.
        await Validator.setDefaults(message, log);
        
        // -----

        return message;
    });
};