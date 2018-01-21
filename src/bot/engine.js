import moment from 'moment';
import colors from 'colors/safe';
import prettyjson from 'prettyjson';
import flatten from 'flat';

import dataProvider from '../lib/dataProvider';
import AlgorithmFactory from './algorithms';

import config from '../../config.json';

// Configure data provider
const dataProviderOptions = {
	mode: ['trades', 'bot'],
	symbols: config.symbols
};

export default class BotEngine {
	constructor(args) {
		
		const { symbol, bot:botName }= args;
		const txnFee = args.txnFee || 0.005;
		const startingBalance = args.startingBalance || 0.25;

		if (!symbol) throw new Error('You must specify a symbol eg. ETHBTC.');
		if (!botName) throw new Error('You must specify a bot eg. gary.');

		this.log();
		this.log(`${colors.bold('Binance Bot Engine')}`);
		this.log(`------------------`);
		this.log();
		this.log(`Symbol: ${colors.bold(symbol)}`);
		this.log(`Transaction Fee: ${colors.bold(txnFee)}`);
		this.log();

		// Set an instance of the dataProvider.
		this.dataProvider = dataProvider;

		// Determine if simulating.
		let simFrom = null;
		let simTo = null;
		if (args.simFrom && args.simTo) {
			try { simFrom = moment(args.simFrom).toDate(); } catch(e) { this.log(`Could not parse simulate from date.`); }
			try { simTo = moment(args.simTo).toDate(); } catch(e) { this.log(`Could not parse simulate to date.`); }
		}

		const simulation = (simFrom !== null && simTo !== null);
		this.log(`Live Mode: ${(simulation) ? `${colors.red('NOT ENABLED')} (Running Simulation)` : colors.green('ENABLED')}`);

		if (simulation) {
			this.log(`Simulation Start: ${moment(simFrom).format('Do MMM YY h:mm:ss a')}`);
			this.log(`Simulation End:   ${moment(simTo).format('Do MMM YY h:mm:ss a')}`);
		}

		this.history = [];
		this.options = {
			batch: args.name || `${botName}_${new Date().getTime()}`,
			symbol: args.symbol,
			bot: botName,
			bank: {
				start: startingBalance,
				current: startingBalance,
				end: 0,
			},
			config: {
				sleep: args.sleep || 3,
				txnFee: txnFee,
			},
			state: {
				time: null,
				order: null,
				evaluation: null,
				coins: 0,
			},
			simulation: {
				enabled: simulation,
				start: simFrom,
				end: simTo,
			},
			timers: {
				start: new Date(),
				end: null,
				timespan: null,
			},
			parameters: {}
		};

		if (args.parameters) {
			this.options.parameters = args.parameters;
		}

		this.printOptions();
	}

	async execute() {
		// Initialise data store and models
		await this.dataProvider.initialise(config.rebuild || false, dataProviderOptions);
		this.log();

		await this.startDataLog();

		if (this.options.simulation.enabled)
			await this.executeSimulation()
		else
			await this.executeStream();

		this.options.timers.end = new Date();
		this.options.timers.timespan = this.options.timers.end.getTime() - this.options.timers.start.getTime();
		this.options.bank.end = this.options.bank.current;

		this.outputTrades();
		await this.endDataLog();

		await this.dataProvider.close();
	}

	async executeSimulation() {

		// Get Processor Type from Algorithm factory
		const Processor = AlgorithmFactory.getProcessor(this.options.bot);

		// Set the start time to the simulated start time.
		this.options.state.time = this.options.simulation.start;

		// Create the bot.
		const bot = new Processor(this.dataProvider);
		await bot.initialise(this.options, this._log);

		let counter = 0;
		while (this.options.state.time < this.options.simulation.end) {
			this.log(`Executing bot: ${this.options.bot}`);

			this.options = await bot.execute(this.options);
			
			const hasInstruction = await this.evaluateInstruction();
			if (hasInstruction === false) {

				// Simulate sleep.
				this.log(`Simulate sleep for ${this.options.config.sleep} second(s).`);
				this.options.state.time.setSeconds(this.options.state.time.getSeconds() + this.options.config.sleep);
			}
			else {
				this.log(`Simulate 1 second for executing order.`);
				this.options.state.time.setSeconds(this.options.state.time.getSeconds() + 1);
			}

			if (counter > 60) {
				await this.sleep(100);
				counter = 0;
			}
			else
				counter++;
		}

	}

	async evaluateInstruction() {
		if (!this.options.state.evaluation) return false; 

		if (this.options.state.evaluation.action === 'buy') {
			this.log(`Received ${colors.black.bgGreen('BUY')} instruction @ ${this.options.state.evaluation.price}`);

			// Complete order;
			await this.placeBuy();
		}
		else if (this.options.state.evaluation.action === 'sell') {
			this.log(`Received ${colors.black.bgRed('SELL')} instruction @ ${this.options.state.evaluation.price}`);

			// Complete order;
			await this.placeSell();
		}

		return true;
	}

	async placeBuy() {
		const { time, volume, behaviour } = this.options.state.evaluation;
		const price = parseFloat(this.options.state.evaluation.price);

		if (this.options.simulation.enabled) {

			if (this.options.bank.current > 0) {
				this.log();
				this.log('Starting Balance:        ', this.options.bank.current.toFixed(10));

				const permittedSpend = (this.options.bank.current * volume);

				const txnCost = permittedSpend * this.options.config.txnFee;
				const actualBalance = permittedSpend - txnCost
				const quantity = parseFloat(((actualBalance) / price).toFixed(4));

				this.log('Recommended Buy Price:   ', price.toFixed(10));
				this.log('% of Balance to be spent:', volume.toFixed(4));
				this.log('Actual Quantity:         ', quantity.toFixed(4));
				this.log();
				this.log('Total Authorised Spend:  ', permittedSpend.toFixed(10))
				this.log('- Transaction Fee:       ', txnCost.toFixed(10));
				this.log('= Purchase Amount:       ', actualBalance.toFixed(10));
				this.log();

				// Order placed.

				this.options.state.coins += quantity;
				this.options.bank.current = this.options.bank.current - permittedSpend;

				this.log('Number of Coins:         ', this.options.state.coins.toFixed(4));
				this.log('Remaining Balance:       ', this.options.bank.current.toFixed(10));
				this.log();

				this.options.state.order = {
					buy: price,
					buyTime: time,
					buyOrderId: new Date().getTime().toString(),
					buyVolume: quantity,
					buyBehaviour: behaviour,
					recommendedBuy: price,
					recommendedBuyTime: time,
					// TODO: Add and log balances at trade time.
				};

				this.options.bank.inplay = this.options.bank.current;
				
				this.log(`Placed ${colors.black.bgGreen('BUY')} order @ ${this.options.state.order.buy}`);
				this.log(`Successful ${colors.black.bgGreen('BUY')} order @ ${this.options.state.order.buy}`);
			}
			else {
				this.log(`${colors.red('Ignored')} ${colors.black.bgGreen('BUY')} order - not enough funds.`);
			}

			this.log();
		}

		this.options.state.evaluation = null;
	}

	async placeSell() {
		let trade = null;

		const { time, volume, behaviour } = this.options.state.evaluation;
		const price = parseFloat(this.options.state.evaluation.price);

		if (this.options.simulation.enabled) {
			if (this.options.state.coins > 0) {
				this.log();
				this.log('Starting Balance:        ', this.options.bank.current.toFixed(10));

				const quantity = (this.options.state.coins * volume);

				const grossAmount = quantity * price;
				const txnCost = grossAmount * this.options.config.txnFee;
				const netAmount = grossAmount - txnCost;

				this.log('Recommended Sell Price:  ', price.toFixed(10));
				this.log('% of Balance to be spent:', volume.toFixed(4));
				this.log('Actual Quantity:         ', quantity.toFixed(4));
				this.log();
				this.log('Sale Amount:             ', grossAmount.toFixed(10));
				this.log('- Transaction Fee:       ', txnCost.toFixed(10));
				this.log('= Net Amount:            ', netAmount.toFixed(10));
				this.log();

				// Order placed.

				this.options.state.coins -= quantity;
				this.options.bank.current = this.options.bank.current + grossAmount;

				this.log('Number of Coins:         ', this.options.state.coins.toFixed(4));
				this.log('Remaining Balance:       ', this.options.bank.current.toFixed(10));
				this.log();

				trade = Object.assign({}, this.options.state.order, {
					sell: price,
					sellTime: time,
					sellOrderId: new Date().getTime().toString(),
					sellVolume: quantity,
					sellBehaviour: behaviour,
					recommendedSell: price,
					recommendedSellTime: time,
				})

				this.log(`Placed ${colors.black.bgRed('SELL')} order @ ${trade.sell}`);
				this.log(`Successful ${colors.black.bgRed('SELL')} order @ ${trade.sell}`);
			}
			else {
				this.log(`${colors.red('Ignored')} ${colors.black.bgRed('SELL')} order - not enough coins.`);
			}

		}

		this.options.state.order = null;
		this.options.state.evaluation = null;

		if (trade) {
			this.history.push(trade);
		}
	}

	async executeStream() {
		return;
	}

	calcTradeData() {
		const result = [];

		let compoundingProfit = 1;
		let profitTradeCount = 0;
		let lossTradeCount = 0;

		this.history.forEach((item, i) => {
			const preFeePerUnit = item.sell - item.buy;
			const preFeeProfit = item.sell / item.buy;

			const txnFeePerUnit = parseFloat(item.sell) * parseFloat(this.options.config.txnFee);
			const postFeePerUnit = preFeePerUnit - txnFeePerUnit;
			const postFeeProfit = item.sell / (parseFloat(item.buy) + txnFeePerUnit);

			if (postFeeProfit > 1)
				profitTradeCount++;
			else
				lossTradeCount++;

			compoundingProfit = compoundingProfit * postFeeProfit;

			result.push(Object.assign({}, item, { preFeePerUnit, preFeeProfit, postFeePerUnit, postFeeProfit, txnFeePerUnit }));
		});

		const profitTradePercentage = (result.length === 0) ? 0 : profitTradeCount / result.length;

		return {
			compoundingProfit,
			profitTradeCount,
			lossTradeCount,
			profitTradePercentage,
			trades: result
		};
	}

	outputTrades() {
		this.log();
		this.log(colors.bold('TRADE HISTORY'));
		this.log(colors.bold('============='));
		this.log();
		this.log(`Transaction Fee: ${this.options.config.txnFee}`);
		this.log();	

		const data = this.calcTradeData();

		if (data.trades.length === 0) {
			this.log('  (No Trades)');
		}
		else {
			let compoundingProfit = 1;
			data.trades.forEach((item, i) => {
				this.log(`Trade #${i+1}`);
				this.log(`------------------------------------------------------------------------`);
				this.log(`${colors.bold('BUY:                   ')} ${item.buy} (${moment(item.buyTime).format('Do MMM YY h:mm:ss a')})`);
				this.log(`${colors.bold('SELL:                  ')} ${item.sell} (${moment(item.sellTime).format('Do MMM YY h:mm:ss a')})`);
				this.log(`Pre-fees Unit:          ${(item.preFeeProfit > 1) ? colors.green(item.preFeePerUnit.toFixed(10)) : colors.red(item.preFeePerUnit.toFixed(10))}`);
				this.log(`Pre-fees Ratio:         ${(item.preFeeProfit > 1) ? colors.green(item.preFeeProfit.toFixed(4)) : colors.red(item.preFeeProfit.toFixed(4))}`);

				this.log(`Transaction Fee / Unit: ${item.txnFeePerUnit.toFixed(10)}`);
				this.log(`Post-fees Unit:         ${(item.postFeeProfit > 1) ? colors.green(item.postFeePerUnit.toFixed(10)) : colors.red(item.postFeePerUnit.toFixed(10))}`);
				this.log(`Post-fees Ratio:        ${(item.postFeeProfit > 1) ? colors.bold.green(item.postFeeProfit.toFixed(4)) : colors.bold.red(item.postFeeProfit.toFixed(4))}`);

				compoundingProfit = compoundingProfit * item.postFeeProfit;
				this.log(`Compound Profit:        ${(compoundingProfit > 1) ? colors.bold.green(compoundingProfit.toFixed(4)) : colors.bold.red(compoundingProfit.toFixed(4))}`);
				this.log();	
			});

			this.log(`${colors.bold('Remaining Coins:')}        ${this.options.state.coins.toFixed(10)}`);
			this.log(`${colors.bold('Final Balance:')}          ${this.options.bank.end.toFixed(10)}`);
			this.log();	
			this.log(`${colors.bold('Overall Profit*:')}        ${(compoundingProfit > 1) ? colors.bold.green(compoundingProfit.toFixed(4)) : colors.bold.red(compoundingProfit.toFixed(4))}`);
		}

		this.log();	
	}

	printOptions() {
		this.log();
		this.log(`Parameters`);
		this.log(`----------`);
		this.log();
		const result = prettyjson.render(this.options).split('\n');
		result.forEach(line => this.log(line));
		this.log();
	}

	log() {
		this._log(colors.black.bgCyan(' BotEngine '), ' ', ...arguments);
	}

	_log() {
		console.log(...arguments);
	}

	async startDataLog() {
		const flatParameterList = flatten(this.options.parameters);

		const msg = {
			key: this.options.batch,
			symbol: this.options.symbol,
			simulation: this.options.simulation.enabled,
			startSimulation: this.options.simulation.start,
			endSimulation: this.options.simulation.end,
			startBalance: this.options.bank.start,
			bot: this.options.bot,
			startExecution: new Date()
		};

		await this.dataProvider.bot.upsert(msg);

		if (Object.keys(flatParameterList).length > 0) {
			const params = Object.keys(flatParameterList).map(key => ({
				botKey: this.options.batch,
				name: key,
				value: (flatParameterList[key] && flatParameterList[key].toString) ? flatParameterList[key].toString() : flatParameterList[key]
			}));

			await this.dataProvider.bot.bulkCreateParameters(params);
		}

	}

	async endDataLog() {
		const data = this.calcTradeData();

		const msg = {
			key: this.options.batch,
			endExecution: this.options.timers.end,
			endBalance: this.options.bank.end,
			executionTime: this.options.timers.timespan,
			endCoins: this.options.state.coins,
			compoundProfit: data.compoundingProfit,
			tradeCount: data.trades.length,
			profitTradeCount: data.profitTradeCount,
			lossTradeCount: data.lossTradeCount,
			profitTradePercentage: data.profitTradePercentage,
		};

		await this.dataProvider.bot.upsert(msg);

		const trades = data.trades.map(item => 
			Object.assign({}, item, { botKey: this.options.batch }));

		await this.dataProvider.bot.bulkCreateTrades(trades);

	}

	sleep(duration) {
		return new Promise(resolve => setTimeout(() => resolve(), duration));
	}

}
