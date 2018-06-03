import 'babel-polyfill';

import lambdaHelper from '../utils/lambdaHelper';
import colors from 'colors/safe';
import Engine from '../engine';
const { Validator, Recorder } = Engine;

const config = {
    title: ' Recorder  ',
    color: colors.black.bgRed
}

exports.handler = async (event, context, callback) => {
    await lambdaHelper.dataWrapper(config, event, context, callback, async (message, log) => {
        log.system.write('MESSAGE', JSON.stringify(message, null, 2));

        await Validator.finalise(message, log);

        // Record any information you want determined at the end of the job.
        await Recorder.setFooter(message, log);

        // Finalise recording actions.
        await Recorder.finalise(message, log);

        // Close or commit any data to disk / store.
        await Recorder.close(message, log);

        return message;
    });
};