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

        const offsetSeconds = parseInt(get(options, 'parameters.ma') || 75); // Seconds
        const offsetDate = moment(options.simulation.start).subtract(offsetSeconds, 'seconds').toDate();

        await this.dataProvider.candlesticks.initialise(symbols);

		for (const idx in symbols) {
			const symbol = symbols[idx];
			if (this.dataProvider.candlesticks.hasData(symbol, offsetDate, true) === false) {
				throw new Error(`There is not enough data for symbol '${symbol}. Trigger: ${offsetDate}`);
			}

			if (this.dataProvider.candlesticks.hasData(symbol, options.simulation.end, false) === false) {
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
		const trigger = maResult.currentPrice < maResult.offsetMaPrice;

		let sellThresholdCrossed = false;
		let period = 0;

		if (trigger) {
			period = get(options, `state.${symbol}.period`) || 0;
			period++;

			if (period >= periodLimit) {
				sellThresholdCrossed = true;
			}
		}

		// TODO: Add a hard sell point
		
		this.log(`CURRENT PRICE:  ${maResult.currentPrice.toFixed(10)}`);
		this.log(`MA:             ${maResult.offsetMaPrice.toFixed(10)} [${maResult.maPrice.toFixed(10)} @ ${maResult.offset.toFixed(2)}]`);
		this.log(`PERIOD TRIGGER: ${period} [${periodLimit}]`);
		this.log(`THRESHOLD:      ${sellThresholdCrossed ? colors.bold('YES') : 'NO'}`);

		if (!behaviour && sellThresholdCrossed) behaviour = 'MA Breach Threshold';
		this.log(`RECOMMEND:      ${(behaviour) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')}`);
		this.log();

		options.state[symbol].period = period;

		if (behaviour) {
			options.state[symbol].period = 0;
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
		const trigger = maResult.currentPrice > maResult.offsetMaPrice;

		let buyThresholdCrossed = false;
		let period = 0;

		if (trigger) {
			period = get(options, `state.${symbol}.period`) || 0;
			period++;

			if (period >= periodLimit) {
				buyThresholdCrossed = true;
			}
		}
		
		this.log(`CURRENT PRICE:  ${maResult.currentPrice.toFixed(10)}`);
		this.log(`MA:             ${maResult.offsetMaPrice.toFixed(10)} [${maResult.maPrice.toFixed(10)} @ ${maResult.offset.toFixed(2)}]`);
		this.log(`PERIOD TRIGGER: ${period} [${periodLimit}]`);
		this.log(`THRESHOLD:      ${buyThresholdCrossed ? colors.bold('YES') : 'NO'}`);
		
		if (!behaviour && buyThresholdCrossed) behaviour = 'MA Breach Threshold';
		this.log(`RECOMMEND:      ${(behaviour) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')} ${(supress === true) ? '(Suppression Active)' : ''}`);
		this.log();

		options.state[symbol].period = period;

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
			options.state[symbol].period = 0;
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

	async getPriceAndMovingAverage(options, symbol, action) {
		const parameter = get(options, `parameters.${action}`) || {};
		const offset = get(parameter, 'offset') || 1;

		const maResult = await this.determineMa(symbol, options);
		const currentPrice = maResult.price;
		const offsetMaPrice = (maResult.maPrice * offset);

		options.state[symbol].price = currentPrice;
		options.state[symbol].ma = offsetMaPrice;

		return {
			currentPrice,
			maPrice: maResult.maPrice,
			offsetMaPrice,
			offset,
		};
	}

	async finalise(options, executeOrderCallback) {
		const baseWallet = this.getWallet(options, this.baseSymbol, ACTION_SELL);
		const symbolWallet = this.getWallet(options, options.symbol, ACTION_SELL);

		this.log();
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
			this.log(`Evaluate SELL for ${options.symbol}: ${colors.bold.green('ACT')}`);
		}
		else {
			this.log(`Evaluate SELL for ${options.symbol}: ${colors.bold.red('NO ACTION')}`);
		}
		
		
		if (baseWallet.value > 0) {
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

	async determineMa(symbol, options) {

		const { time } = options.state;

		const maPeriod = parseInt(get(options, 'parameters.ma') || 20); // Seconds;

		// ------------------------------------------------

		const offsetDate = moment(new Date(time)).subtract(maPeriod, 'seconds').toDate();
		const dataset = await this.dataProvider.candlesticks.getByDateTimeRange(symbol, null, offsetDate, time);
		const close = parseFloat(dataset[dataset.length-1].close);

		const maPrice = dataset.reduce((accumulator, item) => accumulator + item.close, 0) / dataset.length;

		return {
			price: dataset[dataset.length-1].close,
			time,
			maPrice,
		};

	}

	log() {
		this.logger(colors.black.bgYellow(' VenomBot  '), ' ', ...arguments);
	}

	async writeLog(options) {
		const { orders, time } = options.state;
		const symbols = [this.baseSymbol, options.symbol];
		const result = { time: new Date(time) };

		for (const key in options.wallet) {
			const wallet = options.wallet[key];
			result[`wallet_${key}_value`] = wallet.value;
		}

		const initOrder = (result, symbol) => {
			result[`order_${symbol}_symbol`] = null;
			result[`order_${symbol}_action`] = null;
			result[`order_${symbol}_behaviour`] = null;			
		};

		const appendOrder = (result, order) => {
			if (order) {
				result[`order_${order.symbol}_symbol`] = order.symbol;
				result[`order_${order.symbol}_action`] = order.action;
				result[`order_${order.symbol}_behaviour`] = order.behaviour;
			}
		};

		symbols.forEach(symbol => {
			result[`${symbol}_price`] = options.state[symbol].price;
			result[`${symbol}_ma`] = options.state[symbol].ma;
		});

		initOrder(result, this.baseSymbol);
		initOrder(result, options.symbol);

		let symbolSellOrder = orders.find(item => item.symbol === options.symbol && item.action === ACTION_SELL);
		appendOrder(result, symbolSellOrder);

		const baseSellOrder = orders.find(item => item.symbol === this.baseSymbol && item.action === ACTION_SELL);
		appendOrder(result, baseSellOrder);

		const baseBuyOrder = orders.find(item => item.symbol === this.baseSymbol && item.action === ACTION_BUY);
		appendOrder(result, baseBuyOrder);

		const symbolBuyOrder = orders.find(item => item.symbol === options.symbol && item.action === ACTION_BUY);
		appendOrder(result, symbolBuyOrder);

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