import lambdaHelper from '../utils/lambdaHelper';

const config = {
    title: ' Validator ',
    color: colors.black.bgCyan
}

exports.handler = function(event, context, callback) {
    lambdaHelper.dataWrapper(config, event, context, callback, (message, log) => {
        log.application.write('MESSAGE', JSON.stringify(message, null, 2));

        /// Call validateRequest.

        message.step = {
            valid: true 
        };

        return message;
    });
}