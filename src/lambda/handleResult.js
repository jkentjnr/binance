import 'babel-polyfill';

import lambdaHelper from '../utils/lambdaHelper';
import colors from 'colors/safe';

const config = {
    title: ' Respondr  ',
    color: colors.black.bgBlue
}

exports.handler = async (event, context, callback) => {
    await lambdaHelper.dataWrapper(config, event, context, callback, async (message, log) => {
        log.system.write('MESSAGE', JSON.stringify(message, null, 2));
        return message;
    });
};