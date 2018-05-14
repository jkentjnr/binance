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

    static async validateData(message, log, dataProvider) {

        const errors = [];
        const periodCode = botHelper.getPeriodName(message.period);

        if (message.simulation === true) {
            
            const ma = Math.max(parseInt(get(message, 'parameters.buy.ma')), parseInt(get(message, 'parameters.sell.ma')));
            const range = Math.max(parseInt(get(message, 'parameters.buy.period')) + 1, parseInt(get(message, 'parameters.sell.period')) + 1);

            const offsetSeconds = (ma + range) * message.period;
            const offsetDate = moment(message.from).subtract(offsetSeconds, 'seconds').toDate();

            console.log('ma', ma);
            console.log('range', range);
            console.log('offsetSeconds', offsetSeconds);
            console.log('offsetDate', offsetDate);

            if (!dataProvider || !dataProvider.candlesticks) {
                errors.push(`Could not find data for symbol '${message.symbol}. Trigger: Start Date - ${offsetDate}`);
            }

            if (dataProvider.candlesticks.initialise)
                await dataProvider.candlesticks.initialise(message.symbol, periodCode, offsetDate, message.to);
            
            const startData = await dataProvider.candlesticks.getNext(message.symbol, offsetDate, true);
            const endData = await dataProvider.candlesticks.getNext(message.symbol, message.to, false);

            console.log('startData', offsetDate, startData);
            console.log('endDate', message.to, endData);

            if (!startData) {
                errors.push(`Could not find data for symbol '${message.symbol}'. Trigger: Start Date - ${offsetDate}`);
            }
            else if (startData.date_period_start > offsetDate) {
                errors.push(`There is not enough data for symbol '${message.symbol}'. Trigger: Start Date - ${offsetDate}`);
            }

            if (!endData) {
                errors.push(`Could not find data for symbol '${message.symbol}'. Trigger: End Date - ${message.to}`);
            }
            else if (endData.date_period_start < message.end) {
                errors.push(`There is not enough data for symbol '${message.symbol}'. Trigger: End Date - ${message.to}`);
            }
        }

        return errors;

    }

}
