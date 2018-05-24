import 'babel-polyfill';

import lambdaHelper from '../utils/lambdaHelper';
import colors from 'colors/safe';
import Engine from '../engine';
const { Trader } = Engine;

const config = {
    title: '  Trader   ',
    color: colors.black.bgYellow
}

exports.handler = async (event, context, callback) => {
    await lambdaHelper.dataWrapper(config, event, context, callback, async (message, log) => {
        log.system.write('MESSAGE', JSON.stringify(message, null, 2));

        await Trader.execute(message, log);

        return message;
    });
}