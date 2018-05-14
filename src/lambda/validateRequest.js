import lambdaHelper from '../utils/lambdaHelper';
import colors from 'colors/safe';
import { Validator } from '../engine';

const config = {
    title: ' Validator ',
    color: colors.black.bgCyan
}

exports.handler = function(event, context, callback) {
    lambdaHelper.dataWrapper(config, event, context, callback, async (message, log) => {
        log.application.write('MESSAGE', JSON.stringify(message, null, 2));

        // Call validateRequest.
        const response = await new Validator.validate(message, log);

        message.step = {
            valid: response.valid
        };

        return message;
    });
}