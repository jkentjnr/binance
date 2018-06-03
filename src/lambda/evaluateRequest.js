import 'babel-polyfill';

import lambdaHelper from '../utils/lambdaHelper';
import colors from 'colors/safe';
import Engine from '../engine';
const { Evaluator } = Engine;

const config = {
    title: ' Evaluate  ',
    color: colors.black.bgYellow.bind(this)
}

exports.handler = async (event, context, callback) => {
    await lambdaHelper.dataWrapper(config, event, context, callback, async (message, log) => {
        log.system.write('MESSAGE', JSON.stringify(message, null, 2));

        const response = await Evaluator.evaluate(message, log);
        message.step.dispatch = response.dispatch;
        message.config.closeDataConnections = true;

        return message;
    });
}