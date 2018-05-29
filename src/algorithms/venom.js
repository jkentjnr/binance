import BotBase from './botbase';
import assert from 'assert';
import moment from 'moment';
import get from 'lodash.get';
import set from 'lodash.set';
import now from 'performance-now';
import colors from 'colors/safe';
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
				"baseSymbol": {"type": "string", "required": true},
				"buy": {
					"type": "object",
					"properties": {
						"ma": {"type": "integer", "required": true},
						"period": {"type": "integer", "required": true},
						"offset": {"type": "integer", "required": true},
					}
				},
				"sell": {
					"type": "object",
					"properties": {
						"ma": {"type": "integer", "required": true},
						"period": {"type": "integer", "required": true},
						"offset": {"type": "integer", "required": true},
					}
				}
            }
        };
	}
	
    async setDefaults(message) {
		if (!message.name) {
			message.name = `${new Date().getTime()}_${message.bot}_${message.symbol}_${message.parameters.baseSymbol}`;
		}

        if (!get(message, 'execution.totalTrades')) {
            if (message.history) {
                set(message, 'execution.totalTrades', message.history.length);
            }
        }
		
        return message;
    }

    async initialise(message, log, dataProvider) {
        this.isInitialised = true;
        this.dataProvider = dataProvider;
        this.periodName = botHelper.getPeriodName(message.period);

		if (!message.state[message.symbol]) {
            message.state[message.symbol] = {};
        }

        if (!message.state[message.parameters.baseSymbol]) {
            message.state[message.parameters.baseSymbol] = {};
		}
		
        if (!message.wallet) {
            message.wallet = {
                USD: {
                    value: message.bank,
                    buy: [ message.parameters.baseSymbol ],
                    sell: null
                },
                BASE: {
                    value: 0,
                    buy: [ message.symbol ],
                    sell: [ message.parameters.baseSymbol ]
                },
                ALT: {
                    value: 0,
                    buy: null,
                    sell: [ message.symbol ]
                }
            };
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

            if (dataProvider.candlesticks.initialise) {
				await dataProvider.candlesticks.initialise(message.symbol, this.periodName, offsetDate, message.to);
				await dataProvider.candlesticks.initialise(message.parameters.baseSymbol, this.periodName, offsetDate, message.to);
			}
            
            const startData = await dataProvider.candlesticks.getNext(message.symbol, offsetDate, true);
			const endData = await dataProvider.candlesticks.getNext(message.symbol, message.to, false);
			
            const baseStartData = await dataProvider.candlesticks.getNext(message.parameters.baseSymbol, offsetDate, true);
            const baseEndData = await dataProvider.candlesticks.getNext(message.parameters.baseSymbol, message.to, false);

            // console.log('startData', offsetDate, startData);
            // console.log('endDate', message.to, endData);

            return {
                from: offsetDate,
                to: message.to,
                firstRecord: startData,
				lastRecord: endData,
				baseFirstRecord: baseStartData,
				baseLastRecord: baseEndData,
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
			
            if (!response.baseFirstRecord) {
                errors.push(`Could not find data for symbol '${message.parameters.baseSymbol}'. Trigger: Start Date - ${response.from}`);
            }
            else if (response.baseFirstRecord.date_period_start > response.from) {
                errors.push(`There is not enough data for symbol '${message.parameters.baseSymbol}'. Trigger: Start Date - ${response.from}`);
            }

            if (!response.baseLastRecord) {
                errors.push(`Could not find data for symbol '${message.parameters.baseSymbol}'. Trigger: End Date - ${response.to}`);
            }
            else if (response.baseLastRecord.date_period_start < response.to) {
                errors.push(`There is not enough data for symbol '${message.parameters.baseSymbol}'. Trigger: End Date - ${response.to}`);
            }
        }

        return errors;

    }

    async evaluate(message, log) {
        assert(this.isInitialised, 'The venom bot is not initialised.');

		const startTime = now();
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

		// ---------------------------------------------
		// Execute Instructions

		if (message.state.instruction.symbol === actions.ACTION_SELL) {
			const didSell = await this.sell(message.symbol, message, log);
			if (didSell) message.state.instruction.base = actions.ACTION_SELL;
		}

		if (message.state.instruction.base === actions.ACTION_SELL) {
			await this.sell(message.parameters.baseSymbol, message, log);
		}
		
		if (message.state.instruction.base === actions.ACTION_BUY) {
			const didBuy = await this.buy(message.parameters.baseSymbol, message, log);
			if (didBuy) message.state.instruction.symbol = actions.ACTION_BUY;
		}

		if (message.state.instruction.symbol === actions.ACTION_BUY) {
			await this.buy(message.symbol, message, log);
		}

		// ---------------------------------------------

		await this.writeLog(message, log);

		// ---------------------------------------------

		// Finalise orders
		await this.execute(message);

		// ---------------------------------------------

		const endTime = now();
		log.application.write(`Processing Time - ${((endTime - startTime) / 1000).toFixed(4)} second(s).`);
		log.application.write(`-------------------------------------------------`);

		return message;
	}

	async execute(message, supressAutoSell = false) {
		const { orders, time } = message.state;
		
		let symbolSellOrder = orders.find(item => item.symbol === message.symbol && item.action === actions.ACTION_SELL);
		// console.log('symbolSellOrder', symbolSellOrder);

		const baseSellOrder = orders.find(item => item.symbol === message.parameters.baseSymbol && item.action === actions.ACTION_SELL);
		// console.log('baseSellOrder', baseSellOrder);

		const baseBuyOrder = orders.find(item => item.symbol === message.parameters.baseSymbol && item.action === actions.ACTION_BUY);
		// console.log('baseBuyOrder', baseBuyOrder);

		const symbolBuyOrder = orders.find(item => item.symbol === message.symbol && item.action === actions.ACTION_BUY);
		// console.log('symbolBuyOrder', symbolBuyOrder);

		// ---------------------------------------------

		// If sell order for base and no sell for symbol ... sell symbol.
		if (supressAutoSell === false && (!symbolSellOrder && baseSellOrder)) {
			const record = await this.dataProvider.candlesticks.getNext(message.symbol, time, true);
			symbolSellOrder = {
				symbol: message.symbol,
				action: actions.ACTION_SELL,
				volume: 1,
				price: record.px_close,
				time: new Date(time),
				behaviour: 'Force sell by base coin sale'
			};
		}

		// ---------------------------------------------
		
		await this.writeLog(message);

		// Clear the orders state -- used for working.
		message.state.orders = [];

		// ---------------------------------------------

		message.orders = [];
		if (symbolSellOrder) message.orders.push(symbolSellOrder);		// await executeOrderCallback(symbolSellOrder, options);
		if (baseSellOrder)   message.orders.push(baseSellOrder);		// await executeOrderCallback(baseSellOrder, options);
		if (baseBuyOrder)    message.orders.push(baseBuyOrder); 		// await executeOrderCallback(baseBuyOrder, options);
		if (symbolBuyOrder)  message.orders.push(symbolBuyOrder);		// await executeOrderCallback(symbolBuyOrder, options);

	}

	async buy(symbol, message, log) {

        log.application.write(`Mode: ${colors.cyan(`EVALUATE BUY: ${symbol}`)}`);
		const { time } = message.state;
		const { hasExecuted, supress } = message.state[symbol];
		
		let behaviour = null;

		const buyParameter = get(message, 'parameters.buy') || {};
		const periodLimit = get(buyParameter, 'period') || 0;

		const maResult = await this.getPriceAndMovingAverage(message, symbol, actions.ACTION_BUY);
		const currentPrice = maResult.currentPrice;
		const offsetMaPrice = maResult.offsetMaPrice;
		const buyThresholdCrossed = maResult.trigger;
		
		log.application.write(`CURRENT PRICE:  ${maResult.currentPrice.toFixed(10)}`);
		log.application.write(`MA:             ${maResult.offsetMaPrice.toFixed(10)} [${maResult.maPrice.toFixed(10)} @ ${maResult.offset.toFixed(2)}]`);
		log.application.write(`THRESHOLD:      ${buyThresholdCrossed ? colors.bold('YES') : 'NO'}`);
		
		if (!behaviour && buyThresholdCrossed) behaviour = 'MA Breach Threshold';
		log.application.write(`RECOMMEND:      ${(behaviour) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')} ${(supress === true) ? '(Suppression Active)' : ''}`);
		log.application.write();

		if (!hasExecuted) {
			// Initial MA is to buy - we need a crossover so supress buy.
			message.state[symbol].supress = (!!behaviour);
			message.state[symbol].hasExecuted = true;
			return false;
		}

		// Supress buy if instruction say to buy.
		if (behaviour && supress) return false;

		// Remove supression as not currently indicating buy.
		if (!behaviour && supress) {
			message.state[symbol].supress = false;
			return false;
		}

		if (behaviour) {
			message.state.orders.push({
				symbol,
				action: actions.ACTION_BUY,
				volume: 1,
				price: currentPrice,
				time: new Date(time),
				behaviour,
			});

			return true;
		}

		return false;
	}

	async sell(symbol, message, log) {
        log.application.write(`Mode: ${colors.magenta(`EVALUATE SELL: ${symbol}`)}`);
		
		const { time } = message.state;
		//const { buy: buyPrice, buyTime } = message.state[symbol].order;

		let behaviour = null;

		const sellParameter = get(message, 'parameters.sell') || {};

		const periodLimit = get(sellParameter, 'period') || 0;

		const maResult = await this.getPriceAndMovingAverage(message, symbol, actions.ACTION_SELL);
		const currentPrice = maResult.currentPrice;
		const offsetMaPrice = maResult.offsetMaPrice;
		const sellThresholdCrossed = maResult.trigger;

		// TODO: Add a hard sell point
		
		log.application.write(`CURRENT PRICE:  ${maResult.currentPrice.toFixed(10)}`);
		log.application.write(`MA:             ${maResult.offsetMaPrice.toFixed(10)} [${maResult.maPrice.toFixed(10)} @ ${maResult.offset.toFixed(2)}]`);
		log.application.write(`THRESHOLD:      ${sellThresholdCrossed ? colors.bold('YES') : 'NO'}`);

		if (!behaviour && sellThresholdCrossed) behaviour = 'MA Breach Threshold';
		log.application.write(`RECOMMEND:      ${(behaviour) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')}`);
		log.application.write();

		if (behaviour) {
			message.state.orders.push({
				symbol,
				action: actions.ACTION_SELL,
				volume: 1,
				price: currentPrice,
				time: new Date(time),
				behaviour,
			});

			return true;
		}

		return false;
	}

	async finalise(message, log) {
		const baseWallet = botHelper.getWallet(message, message.parameters.baseSymbol, actions.ACTION_SELL);
		const symbolWallet = botHelper.getWallet(message, message.symbol, actions.ACTION_SELL);

		log.application.write();

		let forceSellBase = false;
		if (symbolWallet.value > 0) {
			const currentPrice = message.state[message.symbol].price;
			message.state.orders.push({
				symbol: message.symbol,
				action: actions.ACTION_SELL,
				volume: 1,
				price: currentPrice,
				time: new Date(message.state.time),
				behaviour: 'Force sell -- finalise'
			});
			forceSellBase = true;
			log.application.write(`Evaluate SELL for ${message.symbol}: ${colors.bold.green('ACT')}`);
		}
		else {
			log.application.write(`Evaluate SELL for ${message.symbol}: ${colors.bold.red('NO ACTION')}`);
		}
		
		if (forceSellBase || baseWallet.value > 0) {
			const currentPrice = message.state[message.parameters.baseSymbol].price;
			message.state.orders.push({
				symbol: message.parameters.baseSymbol,
				action: actions.ACTION_SELL,
				volume: 1,
				price: currentPrice,
				time: new Date(message.state.time),
				behaviour: 'Force sell -- finalise'
			});
			log.application.write(`Evaluate SELL for ${message.parameters.baseSymbol}: ${colors.bold.green('ACT')}`);
		}
		else {
			log.application.write(`Evaluate SELL for ${message.parameters.baseSymbol}: ${colors.bold.red('NO ACTION')}`);
		}
		
		log.application.write();

		await this.execute(message, true);

		// -----------------------------------------------------------------------------------
		// Calculate

		const altTrades = botHelper.getTradesBySymbol(message, message.symbol);
		const altTradeStats = botHelper.getTradeStats(altTrades);
		set(message, 'execution.altTradeCount', altTradeStats.totalCompleteTrades);
		set(message, 'execution.altProfitTradeCount', altTradeStats.profitTrades);
		set(message, 'execution.altLossTradeCount', altTradeStats.lossTrades);
		set(message, 'execution.altTotalIndividualTrades', altTradeStats.totalIndividualTrades);

		const baseTrades = botHelper.getTradesBySymbol(message, message.parameters.baseSymbol);
		const baseTradeStats = botHelper.getTradeStats(baseTrades);
		set(message, 'execution.baseTradeCount', baseTradeStats.totalCompleteTrades);
		set(message, 'execution.baseProfitTradeCount', baseTradeStats.profitTrades);
		set(message, 'execution.baseLossTradeCount', baseTradeStats.lossTrades);
		set(message, 'execution.baseTotalIndividualTrades', baseTradeStats.totalIndividualTrades);

		const totalTradeCount = altTradeStats.totalCompleteTrades + baseTradeStats.totalCompleteTrades;
		set(message, 'execution.tradeCount', totalTradeCount);

		const profitTradeCount = altTradeStats.profitTrades + baseTradeStats.profitTrades;
		set(message, 'execution.profitTradeCount', profitTradeCount);

		const lossTradeCount = altTradeStats.lossTrades + baseTradeStats.lossTrades;
		set(message, 'execution.lossTradeCount', lossTradeCount);




		//throw new Error();
	}

	// -------------------------------------------------------
	// Journalling

	async writeLog(message, log) {
		const { orders, time } = message.state;
		const symbols = [message.parameters.baseSymbol, message.symbol];
		const result = { time: new Date(time) };

		const fiatKey = 'fiat';
		const baseKey = 'base_coin';
		const altKey = 'alt_coin';

		for (const key in message.wallet) {
			const wallet = message.wallet[key];

			let role = null;
			if (wallet.sell === null) 
				role = fiatKey;
			else if (wallet.buy === null)
				role = altKey;
			else
				role = baseKey;
			
			result[`wallet_${role}_value`] = wallet.value;
			result[`wallet_${role}_currency`] = key;
		}

		const initOrder = (result, key, symbol) => {
			result[`order_${key}_symbol`] = null;
			result[`order_${key}_action`] = null;
			result[`order_${key}_behaviour`] = null;			
		};

		const appendOrder = (result, key, order) => {
			if (order) {
				result[`order_${key}_symbol`] = order.symbol;
				result[`order_${key}_action`] = order.action;
				result[`order_${key}_behaviour`] = order.behaviour;
			}
		};

		const transactionData = (result, message, key, symbol) => {
			result[`${key}_symbol`] = symbol;
			result[`${key}_price`] = message.state[symbol].price;
			result[`${key}_ma`] = message.state[symbol].ma;

			result[`${key}_start`] = message.state[symbol].start;
			result[`${key}_end`] = message.state[symbol].end;
			result[`${key}_open`] = message.state[symbol].open;
			result[`${key}_close`] = message.state[symbol].close;
			result[`${key}_high`] = message.state[symbol].high;
			result[`${key}_low`] = message.state[symbol].low;
		};

		transactionData(result, message, baseKey, message.parameters.baseSymbol);
		transactionData(result, message, altKey, message.symbol);

		initOrder(result, baseKey, message.parameters.baseSymbol);
		initOrder(result, altKey, message.symbol);

		let symbolSellOrder = orders.find(item => item.symbol === message.symbol && item.action === actions.ACTION_SELL);
		appendOrder(result, altKey, symbolSellOrder);

		const baseSellOrder = orders.find(item => item.symbol === message.parameters.baseSymbol && item.action === actions.ACTION_SELL);
		appendOrder(result, baseKey, baseSellOrder);

		const baseBuyOrder = orders.find(item => item.symbol === message.parameters.baseSymbol && item.action === actions.ACTION_BUY);
		appendOrder(result, baseKey, baseBuyOrder);

		const symbolBuyOrder = orders.find(item => item.symbol === message.symbol && item.action === actions.ACTION_BUY);
		appendOrder(result, altKey, symbolBuyOrder);

		const idx = message.log.findIndex(item => {
			return moment(item.time).isSame(time);
			//return item.time && new Date(item.time).getTime() === new Date(time).getTime();
		});

		if (idx === -1)
			message.log.push(result);
		else {
			const myObj = message.log[idx];
			Object.keys(myObj).forEach((key) => (myObj[key] == null) && delete myObj[key]);

			message.log[idx] = Object.assign({}, result, myObj);
		}
	}

	// -------------------------------------------------------
	// Helpers

	async getPriceAndMovingAverage(message, symbol, action) {
		const parameter = get(message, `parameters.${action}`) || {};
		const offset = parseFloat(get(parameter, 'offset') || 1);
		const range = parseInt(get(parameter, 'period') || 1);

		const isBelow = (price, maPrice, offset = 1) => (price < (maPrice * offset));

		const maResult = await this.determineMaRange(symbol, message, range, parameter);
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

	async determineMaRange(symbol, message, depth = 1, parameter) {

		const { period } = message;
		const { time } = message.state;

		const result = [];

		const ma = parseInt(get(parameter, 'ma') || 20);
		const range = ma;

		for (let i = 0; i < depth; i++) {
			const endOffset = i * period; 
			const endDate = moment(new Date(time)).subtract(endOffset, 'seconds').toDate();

			const startOffset = endOffset + (range * period) - 1; 
			const startDate = moment(new Date(time)).subtract(startOffset, 'seconds').toDate();

            //console.log('DATASET_MA', i, range, endDate, startDate);
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
