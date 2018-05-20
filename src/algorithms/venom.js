import BotBase from './botbase';
import assert from 'assert';
import moment from 'moment';
import get from 'lodash.get';
import set from 'lodash.set';
import botHelper from '../utils/botHelper';
const { actions } = botHelper;

export default class VenomBot extends BotBase {

    constructor() {
        super();
        this.isInitialised = false;
    }

    getName() {
        return 'venom';
    }

    async addBotSchema(v, schema) {
        schema.properties.parameters = {
            "type": "object",
            "properties": {
                "ma": {"type": "integer", "required": true}
            }
        };
    }

    async initialise(message, log, dataProvider) {
        this.isInitialised = true;
        this.dataProvider = dataProvider;
        this.periodName = botHelper.getPeriodName(message.period);

        if (!message.state) {
            message.state = {};
        }

		if (!message.state.orders) {
			message.state.orders = [];
		}

        if (!message.state.instruction) {
            message.state.instruction = {};
        }

        if (!message.state[message.symbol]) {
            message.state[message.symbol] = {};
        }

        if (!message.state[message.parameters.baseSymbol]) {
            message.state[message.parameters.baseSymbol] = {};
        }

        // ----------------------------------------

        if (message.simulation === true) {
            
            const ma = Math.max(parseInt(get(message, 'parameters.buy.ma')), parseInt(get(message, 'parameters.sell.ma')));
            const range = Math.max(parseInt(get(message, 'parameters.buy.period')) + 1, parseInt(get(message, 'parameters.sell.period')) + 1);

            const offsetSeconds = (ma + range) * message.period;
            const offsetDate = moment(message.from).subtract(offsetSeconds, 'seconds').toDate();

            // console.log('ma', ma);
            // console.log('range', range);
            // console.log('offsetSeconds', offsetSeconds);
            // console.log('offsetDate', offsetDate);

            if (!dataProvider || !dataProvider.candlesticks) {
                errors.push(`Could not find data for symbol '${message.symbol}. Trigger: Start Date - ${offsetDate}`);
            }

            if (dataProvider.candlesticks.initialise)
                await dataProvider.candlesticks.initialise(message.symbol, this.periodName, offsetDate, message.to);
            
            const startData = await dataProvider.candlesticks.getNext(message.symbol, offsetDate, true);
            const endData = await dataProvider.candlesticks.getNext(message.symbol, message.to, false);

            // console.log('startData', offsetDate, startData);
            // console.log('endDate', message.to, endData);

            return {
                from: offsetDate,
                to: message.to,
                firstRecord: startData,
                lastRecord: endData,
            };
        }
    }

    async validateData(message, log, dataProvider) {
        const errors = [];

        if (message.simulation === true) {
            
            const response = await this.initialise(message, log, dataProvider);

            if (!response.firstRecord) {
                errors.push(`Could not find data for symbol '${message.symbol}'. Trigger: Start Date - ${response.from}`);
            }
            else if (response.firstRecord.date_period_start > response.from) {
                errors.push(`There is not enough data for symbol '${message.symbol}'. Trigger: Start Date - ${response.from}`);
            }

            if (!response.lastRecord) {
                errors.push(`Could not find data for symbol '${message.symbol}'. Trigger: End Date - ${response.to}`);
            }
            else if (response.lastRecord.date_period_start < response.to) {
                errors.push(`There is not enough data for symbol '${message.symbol}'. Trigger: End Date - ${response.to}`);
            }
        }

        return errors;

    }

    async evaluate(message, log) {
        assert(this.isInitialised, 'The venom bot is not initialised.');

		log.application.write(`-------------------------------------------------`);
		log.application.write(`Instruction Received`);
		log.application.write(`Evaluate Period - ${moment(message.state.time).format('Do MMM YY h:mm:ss a')}`);
		log.application.write();

		// ---------------------------------------------
		// Determine instructions.

		// Reset instructions
        set(message, 'state.instruction', { base: actions.ACTION_NONE, symbol: actions.ACTION_NONE });
        
		const baseWallet = botHelper.getWallet(message, message.parameters.baseSymbol, actions.ACTION_SELL);
		const symbolWallet = botHelper.getWallet(message, message.symbol, actions.ACTION_SELL);

		// If holding symbol, eval sell for base and symbol
		if (symbolWallet.value > 0) {
			message.state.instruction.base = actions.ACTION_SELL;
			message.state.instruction.symbol = actions.ACTION_SELL;
		}
		// If holding base but not symbol - eval for base sell -- if not sell, then symbol buy
		else if (baseWallet.value > 0) {
			message.state.instruction.base = actions.ACTION_SELL;
			message.state.instruction.symbol = actions.ACTION_BUY;
		}
		// If holding nothing, eval base buy, -- if true then add symbol buy
		else {
			message.state.instruction.base = actions.ACTION_BUY;
			message.state.instruction.symbol = actions.ACTION_NONE;
			await this.getPriceAndMovingAverage(message, message.symbol, actions.ACTION_BUY);
		}

    }

	async getPriceAndMovingAverage(message, symbol, action) {
		const parameter = get(message, `parameters.${action}`) || {};
		const offset = parseFloat(get(parameter, 'offset') || 1);
		const range = parseInt(get(parameter, 'period') || 1);

		const isBelow = (price, maPrice, offset = 1) => (price < (maPrice * offset));

		const maResult = await this.determineMaRange(symbol, message, range);
		const currentPrice = parseFloat(maResult[0].price);
		const offsetMaPrice = parseFloat(maResult[0].maPrice * offset);

		message.state[symbol].price = currentPrice;
		message.state[symbol].ma = offsetMaPrice;

		message.state[symbol].start = maResult[0].start;
		message.state[symbol].end = maResult[0].end;
		message.state[symbol].open = maResult[0].open;
		message.state[symbol].close = maResult[0].close;
		message.state[symbol].high = maResult[0].high;
		message.state[symbol].low = maResult[0].low;

		const initial = isBelow(maResult[maResult.length-1].price, maResult[maResult.length-1].maPrice, offset);
		const crossedOver = maResult.slice(0, maResult.length - 1).reduce((accumulator, item) => 
			(accumulator && isBelow(item.price, item.maPrice, offset) !== initial), true);

		return {
			currentPrice,
			maPrice: maResult[0].maPrice,
			offsetMaPrice,
			offset,
			trigger: (initial && crossedOver)
		};
	}

	async determineMaRange(symbol, message, depth = 1) {

		const { periodSeconds } = message;
		const { time } = message.state;

		const result = [];

		const ma = parseInt(get(message, 'parameters.ma') || 20);
		const range = ma;

		for (let i = 0; i < depth; i++) {
			const endOffset = i * periodSeconds; 
			const endDate = moment(new Date(time)).subtract(endOffset, 'seconds').toDate();

			const startOffset = endOffset + (range * periodSeconds) - 1; 
			const startDate = moment(new Date(time)).subtract(startOffset, 'seconds').toDate();

            //console.log('DATASET_MA', i, range, endDate, startDate);
            console.log('time', time);
			const dataset = await this.dataProvider.candlesticks.getByDateTimeRange(symbol, this.periodName, startDate, endDate);
			//console.log('DATASET_MA', dataset.length, dataset[0].date_period_start, dataset[dataset.length-1].date_period_start);

			const close = parseFloat(dataset[dataset.length-1].px_close);
			//const maPrice = dataset.reduce((accumulator, item) => parseFloat(accumulator + parseFloat(item.px_close)), 0) / dataset.length;

			var sum = 0;
			dataset.forEach(item => sum += parseFloat(item.px_close));
			var maPrice = sum / dataset.length;

			result.push({
				price: parseFloat(dataset[dataset.length-1].px_close),
				time: dataset[dataset.length-1].date_period_start,
				maPrice,

				start: dataset[dataset.length-1].date_period_start,
				end: dataset[dataset.length-1].date_period_end,
				open: dataset[dataset.length-1].px_open,
				close: dataset[dataset.length-1].px_close,
				high: dataset[dataset.length-1].px_high,
				low: dataset[dataset.length-1].px_low,
			});
		}

		return result;
	}
}
