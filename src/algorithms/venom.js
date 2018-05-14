import BotBase from './botbase';
import moment from 'moment';
import get from 'lodash.get';
import botHelper from '../utils/botHelper';

export default class VenomBot extends BotBase {

    static addBotSchema(v, schema) {
        schema.properties.parameters = {
            "type": "object",
            "properties": {
                "ma": {"type": "integer", "required": true}
            }
        };
    }

    static async validateData(message, dataProvider) {

        const errors = [];
        const periodCode = botHelper.getPeriodName(message.period);

        if (message.from && message.to) {
            const ma = Math.max(parseInt(get(message, 'parameters.buy.ma')), parseInt(get(message, 'parameters.sell.ma')));
            const range = Math.max(parseInt(get(message, 'parameters.buy.period')) + 1, parseInt(get(message, 'parameters.sell.period')) + 1);

            const offsetSeconds = (ma + range) * message.period;
            const offsetDate = moment(message.from).subtract(offsetSeconds, 'seconds').toDate();

            if (dataProvider.candlesticks.initialise)
                await dataProvider.candlesticks.initialise(message.symbol, periodCode, offsetDate, message.to);
            
            const startData = await dataProvider.candlesticks.getNext(message.symbol, offsetDate, true);
            const endData = await dataProvider.candlesticks.getNext(message.symbol, message.to, false);

            if (!startData) {
                errors.push(`Could not find data for symbol '${message.symbol}. Trigger: ${offsetDate}`);
            }
            else if (startData.date_period_start > offsetDate) {
                errors.push(`There is not enough data for symbol '${message.symbol}. Trigger: ${offsetDate}`);
            }

            if (!endData) {
                errors.push(`Could not find data for symbol '${message.symbol}. Trigger: ${message.end}`);
            }
            else if (endData.date_period_start < message.end) {
                errors.push(`There is not enough data for symbol '${message.symbol}. Trigger: ${message.end}`);
            }
        }

        return errors;

    }

}
