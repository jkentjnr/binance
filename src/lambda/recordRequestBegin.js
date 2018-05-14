import lambdaHelper from '../utils/lambdaHelper';
import colors from 'colors/safe';

const config = {
    title: ' Recorder  ',
    color: colors.black.bgRed
}

exports.handler = function(event, context, callback) {
    lambdaHelper.dataWrapper(config, event, context, callback, (message, log) => {
        log.system.write('MESSAGE', JSON.stringify(message, null, 2));

        /// Call validateRequest.

        message.step.additional = true;

        return message;
    });
}