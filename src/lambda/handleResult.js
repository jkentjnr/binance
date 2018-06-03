import 'babel-polyfill';

import lambdaHelper from '../utils/lambdaHelper';
import colors from 'colors/safe';

const config = {
    title: ' Respondr  ',
    color: colors.black.bgBlue,
    sendResponse: true,
}

exports.handler = async (event, context, callback) => {
    await lambdaHelper.dataWrapper(config, event, context, callback, async (message, log) => {
        log.system.write('MESSAGE', JSON.stringify(message, null, 2));

        if (message.response) {
            return {
                name: message.name,
                campaign: message.campaign,
                symbol: message.symbol,
                bot: message.bot,
                from: message.from,
                to: message.to,
                period: message.period,
                parameters: message.parameters,
                execution: message.execution,
                history: message.history,
                response: message.response
            };
        }
        else {
            return message.step;
        }

    });
};