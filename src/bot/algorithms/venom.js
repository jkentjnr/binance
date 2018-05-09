import now from 'performance-now';
import colors from 'colors/safe';
import moment from 'moment';
import get from 'lodash.get';
import binanceHelper from './binanceHelper';

const ACTION_NONE = 'none';
const ACTION_SELL = 'sell';
const ACTION_BUY  = 'buy';

export default class VenomBot {
	constructor(dataProvider) {
		this.dataProvider = dataProvider;
		this.baseSymbol = 'BTCUSD';
	}

	async initialise(options, logger) {
		this.logger = logger;
		this.baseSymbol = options.baseSymbol || 'BTCUSD';

		if (!options.wallet)
			throw new Error(`There is no configured wallet.`);

		const symbols = [this.baseSymbol, options.symbol];
		this.extendOptions(symbols, options);

		const ma = parseInt(get(options, 'parameters.ma') || 75);
		const range = Math.max(parseInt(get(options, 'parameters.buy.period') || 5) + 1, parseInt(get(options, 'parameters.sell.period') || 5) + 1);

		const offsetSeconds = (ma + range) * options.periodSeconds;
        const offsetDate = moment(options.simulation.start).subtract(offsetSeconds, 'seconds').toDate();

		for (const idx in symbols) {
			const symbol = symbols[idx];

			if (this.dataProvider.candlesticks.initialise)
			await this.dataProvider.candlesticks.initialise(symbol, options.period, offsetDate, options.simulation.end);
			
			const startData = await this.dataProvider.candlesticks.getNext(symbol, offsetDate, true);
			const endData = await this.dataProvider.candlesticks.getNext(symbol, options.simulation.end, false);

			if (startData.date_period_start > offsetDate) {
				throw new Error(`There is not enough data for symbol '${symbol}. Trigger: ${offsetDate}`);
			}

			if (endData.date_period_start < options.simulation.end) {
				throw new Error(`There is not enough data for symbol '${symbol}. Trigger: ${options.simulation.end}`);
			}

		}
	}

	extendOptions(symbols, options) {
		// Initialise evalution
		if (!options.state.orders) {
			options.state.orders = [];
		}

		options.state.instruction = {};

		for (const idx in symbols) {
			const symbol = symbols[idx];
			options.state[symbol] = {};
		}
	}

	async evaluate(options) {

		this.startTime = now();
		this.log(`-------------------------------------------------`);
		this.log(`Instruction Received`);
		this.log(`Evaluate Period - ${moment(options.state.time).format('Do MMM YY h:mm:ss a')}`);
		this.log();

		// ---------------------------------------------
		// Determine instructions.

		// Reset instructions
		options.state.instruction = { base: ACTION_NONE, symbol: ACTION_NONE };
		
		const baseWallet = this.getWallet(options, this.baseSymbol, ACTION_SELL);
		const symbolWallet = this.getWallet(options, options.symbol, ACTION_SELL);

		// If holding symbol, eval sell for base and symbol
		if (symbolWallet.value > 0) {
			options.state.instruction.base = ACTION_SELL;
			options.state.instruction.symbol = ACTION_SELL;
		}
		// If holding base but not symbol - eval for base sell -- if not sell, then symbol buy
		else if (baseWallet.value > 0) {
			options.state.instruction.base = ACTION_SELL;
			options.state.instruction.symbol = ACTION_BUY;
		}
		// If holding nothing, eval base buy, -- if true then add symbol buy
		else {
			options.state.instruction.base = ACTION_BUY;
			options.state.instruction.symbol = ACTION_NONE;
			await this.getPriceAndMovingAverage(options, options.symbol, ACTION_BUY);
		}

		// ---------------------------------------------
		// Execute Instructions

		if (options.state.instruction.symbol === ACTION_SELL) {
			const didSell = await this.sell(options.symbol, options);
			if (didSell) options.state.instruction.base = ACTION_SELL;
		}

		if (options.state.instruction.base === ACTION_SELL) {
			await this.sell(this.baseSymbol, options);
		}
		
		if (options.state.instruction.base === ACTION_BUY) {
			const didBuy = await this.buy(this.baseSymbol, options);
			if (didBuy) options.state.instruction.symbol = ACTION_BUY;
		}

		if (options.state.instruction.symbol === ACTION_BUY) {
			await this.buy(options.symbol, options);
		}

		// ---------------------------------------------

		await this.writeLog(options);

		// ---------------------------------------------

		this.endTime = now();
		this.log(`Processing Time - ${((this.endTime - this.startTime) / 1000).toFixed(4)} second(s).`);
		this.log(`-------------------------------------------------`);

		return options;
	}

	async execute(options, executeOrderCallback, supressAutoSell = false) {
		const { orders, time } = options.state;
		
		let symbolSellOrder = orders.find(item => item.symbol === options.symbol && item.action === ACTION_SELL);
		// console.log('symbolSellOrder', symbolSellOrder);

		const baseSellOrder = orders.find(item => item.symbol === this.baseSymbol && item.action === ACTION_SELL);
		// console.log('baseSellOrder', baseSellOrder);

		const baseBuyOrder = orders.find(item => item.symbol === this.baseSymbol && item.action === ACTION_BUY);
		// console.log('baseBuyOrder', baseBuyOrder);

		const symbolBuyOrder = orders.find(item => item.symbol === options.symbol && item.action === ACTION_BUY);
		// console.log('symbolBuyOrder', symbolBuyOrder);

		// ---------------------------------------------

		// If sell order for base and no sell for symbol ... sell symbol.

		if (supressAutoSell === false && (!symbolSellOrder && baseSellOrder)) {
			const currentPrice = await binanceHelper.getPriceAtTime(this.dataProvider, options.symbol, time)
			symbolSellOrder = {
				symbol: options.symbol,
				action: ACTION_SELL,
				volume: 1,
				price: currentPrice,
				time: new Date(time),
				behaviour: 'Force sell by base coin sale'
			};
		}

		// ---------------------------------------------

		if (symbolSellOrder) await executeOrderCallback(symbolSellOrder, options);
		if (baseSellOrder)   await executeOrderCallback(baseSellOrder, options);
		if (baseBuyOrder)    await executeOrderCallback(baseBuyOrder, options);
		if (symbolBuyOrder)  await executeOrderCallback(symbolBuyOrder, options);
	
		// ---------------------------------------------

		await this.writeLog(options);

		// Clear the orders.
		options.state.orders = [];
	}

	async sell(symbol, options) {

        this.log(`Mode: ${colors.magenta(`EVALUATE SELL: ${symbol}`)}`);
		
		const { time } = options.state;
		//const { buy: buyPrice, buyTime } = options.state[symbol].order;

		let behaviour = null;

		const sellParameter = get(options, 'parameters.sell') || {};

		const periodLimit = get(sellParameter, 'period') || 0;

		const maResult = await this.getPriceAndMovingAverage(options, symbol, ACTION_SELL);
		const currentPrice = maResult.currentPrice;
		const offsetMaPrice = maResult.offsetMaPrice;
		const sellThresholdCrossed = maResult.trigger;

		// TODO: Add a hard sell point
		
		this.log(`CURRENT PRICE:  ${maResult.currentPrice.toFixed(10)}`);
		this.log(`MA:             ${maResult.offsetMaPrice.toFixed(10)} [${maResult.maPrice.toFixed(10)} @ ${maResult.offset.toFixed(2)}]`);
		this.log(`THRESHOLD:      ${sellThresholdCrossed ? colors.bold('YES') : 'NO'}`);

		if (!behaviour && sellThresholdCrossed) behaviour = 'MA Breach Threshold';
		this.log(`RECOMMEND:      ${(behaviour) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')}`);
		this.log();

		if (behaviour) {
			options.state.orders.push({
				symbol,
				action: ACTION_SELL,
				volume: 1,
				price: currentPrice,
				time: new Date(time),
				behaviour,
			});
		}

		return options;
	}
	
	async buy(symbol, options) {

        this.log(`Mode: ${colors.cyan(`EVALUATE BUY: ${symbol}`)}`);
		const { time } = options.state;
		const { hasExecuted, supress } = options.state[symbol];
		
		let behaviour = null;

		const buyParameter = get(options, 'parameters.buy') || {};
		const periodLimit = get(buyParameter, 'period') || 0;

		const maResult = await this.getPriceAndMovingAverage(options, symbol, ACTION_BUY);
		const currentPrice = maResult.currentPrice;
		const offsetMaPrice = maResult.offsetMaPrice;
		const buyThresholdCrossed = maResult.trigger;
		
		this.log(`CURRENT PRICE:  ${maResult.currentPrice.toFixed(10)}`);
		this.log(`MA:             ${maResult.offsetMaPrice.toFixed(10)} [${maResult.maPrice.toFixed(10)} @ ${maResult.offset.toFixed(2)}]`);
		this.log(`THRESHOLD:      ${buyThresholdCrossed ? colors.bold('YES') : 'NO'}`);
		
		if (!behaviour && buyThresholdCrossed) behaviour = 'MA Breach Threshold';
		this.log(`RECOMMEND:      ${(behaviour) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')} ${(supress === true) ? '(Suppression Active)' : ''}`);
		this.log();

		if (!hasExecuted) {
			// Initial MA is to buy - we need a crossover so supress buy.
			options.state[symbol].supress = (!!behaviour);
			options.state[symbol].hasExecuted = true;
			return false;
		}

		// Supress buy if instruction say to buy.
		if (behaviour && supress) return false;

		// Remove supression as not currently indicating buy.
		if (!behaviour && supress) {
			options.state[symbol].supress = false;
			return false;
		}

		if (behaviour) {
			options.state.orders.push({
				symbol,
				action: ACTION_BUY,
				volume: 1,
				price: currentPrice,
				time: new Date(time),
				behaviour,
			});

			return true;
		}

		return false;
	}

	async finalise(options, executeOrderCallback) {
		const baseWallet = this.getWallet(options, this.baseSymbol, ACTION_SELL);
		const symbolWallet = this.getWallet(options, options.symbol, ACTION_SELL);

		this.log();

		let forceSellBase = false;
		if (symbolWallet.value > 0) {
			const currentPrice = options.state[options.symbol].price;
			options.state.orders.push({
				symbol: options.symbol,
				action: ACTION_SELL,
				volume: 1,
				price: currentPrice,
				time: new Date(options.state.time),
				behaviour: 'Force sell -- finalise'
			});
			forceSellBase = true;
			this.log(`Evaluate SELL for ${options.symbol}: ${colors.bold.green('ACT')}`);
		}
		else {
			this.log(`Evaluate SELL for ${options.symbol}: ${colors.bold.red('NO ACTION')}`);
		}
		
		if (forceSellBase || baseWallet.value > 0) {
			const currentPrice = options.state[this.baseSymbol].price;
			options.state.orders.push({
				symbol: this.baseSymbol,
				action: ACTION_SELL,
				volume: 1,
				price: currentPrice,
				time: new Date(options.state.time),
				behaviour: 'Force sell -- finalise'
			});
			this.log(`Evaluate SELL for ${this.baseSymbol}: ${colors.bold.green('ACT')}`);
		}
		else {
			this.log(`Evaluate SELL for ${this.baseSymbol}: ${colors.bold.red('NO ACTION')}`);
		}
		
		this.log();

		const result = await this.execute(options, executeOrderCallback, true);

		await this.writeLog(options);

		return result;
	}

	getWallet(options, symbol, action = ACTION_SELL) {
		for (const key in options.wallet) {
			const wallet = options.wallet[key];
			if (action === ACTION_BUY && wallet.buy && wallet.buy.includes(symbol)) return wallet;
			if (action === ACTION_SELL && wallet.sell && wallet.sell.includes(symbol)) return wallet;
		}

		throw new Error(`Wallet not found for ${action} ${symbol}`);
	}

	async getPriceAndMovingAverage(options, symbol, action) {
		const parameter = get(options, `parameters.${action}`) || {};
		const offset = parseInt(get(parameter, 'offset') || 1);
		const range = parseInt(get(parameter, 'period') || 1);

		const isBelow = (price, maPrice, offset = 1) => (price < (maPrice * offset));

		const maResult = await this.determineMaRange(symbol, options, range + 1);
		const currentPrice = parseFloat(maResult[0].price);
		const offsetMaPrice = parseFloat(maResult[0].maPrice * offset);

		options.state[symbol].price = currentPrice;
		options.state[symbol].ma = offsetMaPrice;

		options.state[symbol].start = maResult[0].start;
		options.state[symbol].end = maResult[0].end;
		options.state[symbol].open = maResult[0].open;
		options.state[symbol].close = maResult[0].close;
		options.state[symbol].high = maResult[0].high;
		options.state[symbol].low = maResult[0].low;

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

	async determineMaRange(symbol, options, depth = 1) {

		const { periodSeconds } = options;
		const { time } = options.state;

		const result = [];

		const ma = parseInt(get(options, 'parameters.ma') || 20);
		const range = ma + depth;

		for (let i = 0; i < depth; i++) {			
			const endOffset = i * periodSeconds; 
			const endDate = moment(new Date(time)).subtract(endOffset, 'seconds').toDate();

			const startOffset = endOffset + (range * periodSeconds); 
			const startDate = moment(new Date(time)).subtract(startOffset, 'seconds').toDate();

			const dataset = await this.dataProvider.candlesticks.getByDateTimeRange(symbol, options.period, startDate, endDate);

			const close = parseFloat(dataset[dataset.length-1].px_close);
			const maPrice = dataset.reduce((accumulator, item) => parseFloat(accumulator + parseFloat(item.px_close)), 0) / dataset.length;
	
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

	log() {
		this.logger(colors.black.bgYellow(' VenomBot  '), ' ', ...arguments);
	}

	async writeLog(options) {
		const { orders, time } = options.state;
		const symbols = [this.baseSymbol, options.symbol];
		const result = { time: new Date(time) };

		const fiatKey = 'fiat';
		const baseKey = 'base_coin';
		const altKey = 'alt_coin';

		for (const key in options.wallet) {
			const wallet = options.wallet[key];

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

		const transactionData = (result, options, key, symbol) => {
			result[`${key}_symbol`] = symbol;
			result[`${key}_price`] = options.state[symbol].price;
			result[`${key}_ma`] = options.state[symbol].ma;

			result[`${key}_start`] = options.state[symbol].start;
			result[`${key}_end`] = options.state[symbol].end;
			result[`${key}_open`] = options.state[symbol].open;
			result[`${key}_close`] = options.state[symbol].close;
			result[`${key}_high`] = options.state[symbol].high;
			result[`${key}_low`] = options.state[symbol].low;
		};

		transactionData(result, options, baseKey, this.baseSymbol);
		transactionData(result, options, altKey, options.symbol);

		initOrder(result, baseKey, this.baseSymbol);
		initOrder(result, altKey, options.symbol);

		let symbolSellOrder = orders.find(item => item.symbol === options.symbol && item.action === ACTION_SELL);
		appendOrder(result, altKey, symbolSellOrder);

		const baseSellOrder = orders.find(item => item.symbol === this.baseSymbol && item.action === ACTION_SELL);
		appendOrder(result, baseKey, baseSellOrder);

		const baseBuyOrder = orders.find(item => item.symbol === this.baseSymbol && item.action === ACTION_BUY);
		appendOrder(result, baseKey, baseBuyOrder);

		const symbolBuyOrder = orders.find(item => item.symbol === options.symbol && item.action === ACTION_BUY);
		appendOrder(result, altKey, symbolBuyOrder);

		const idx = options.log.findIndex(item => item.time.getTime() === time.getTime());

		if (idx === -1)
			options.log.push(result);
		else {
			const myObj = options.log[idx];
			Object.keys(myObj).forEach((key) => (myObj[key] == null) && delete myObj[key]);

			options.log[idx] = Object.assign({}, result, myObj);
		}
	}

}