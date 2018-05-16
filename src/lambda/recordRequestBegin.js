import 'babel-polyfill';

import lambdaHelper from '../utils/lambdaHelper';
import colors from 'colors/safe';
import Engine from '../engine';
const { Recorder } = Engine;

const config = {
    title: ' Recorder  ',
    color: colors.black.bgRed
}

exports.handler = function(event, context, callback) {
    lambdaHelper.dataWrapper(config, event, context, callback, async (message, log) => {
        log.system.write('MESSAGE', JSON.stringify(message, null, 2));

        // Record any information you want logged at the start of the job.
        await Recorder.setHeader(message, log);

        // Close or commit any data to disk / store.
        await Recorder.close();

        return message;
    });
}