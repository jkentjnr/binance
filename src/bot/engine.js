import moment from 'moment';
import colors from 'colors/safe';

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

		if (!symbol) throw new Error('You must specify a symbol eg. ETHBTC.');
		if (!botName) throw new Error('You must specify a bot eg. gary.');

		this.log(`Symbol: ${colors.bold(symbol)}`);
		this.log(`Transaction Fee: ${colors.bold(txnFee)}`);
		this.log();

		// Determine if simulating.
		let simFrom = null;
		let simTo = null;
		if (args.simFrom && args.simTo) {
			try { simFrom = moment(args.simFrom).toDate(); } catch(e) { this.log(`Could not parse simulate from date.`); }
			try { simTo = moment(args.simTo).toDate(); } catch(e) { this.log(`Could not parse simulate to date.`); }
		}

		const simulation = (simFrom && simTo);
		this.log(`Live Mode: ${(simulation) ? `${colors.red('NOT ENABLED')} (Running Simulation)` : colors.green('ENABLED')}`);

		if (this.simulation) {
			this.log(`Simulation Start: ${moment(simFrom).format('Do MMM YY h:mm:ss a')}`);
			this.log(`Simulation End:   ${moment(simTo).format('Do MMM YY h:mm:ss a')}`);
		}

		this.history = [];
		this.options = {
			batch: args.name || `${botName}_${new Date().getTime()}`,
			symbol: args.symbol,
			bot: botName,
			config: {
				sleep: args.sleep || 3,
				txnFee: txnFee,
			},
			state: {
				time: null,
				order: null,
				evaluation: null,
			},
			simulation: {
				enabled: simulation,
				start: simFrom,
				end: simTo,
			}
		};
	}

	async execute() {
		// Initialise data store and models
		await dataProvider.initialise(config.rebuild || false, dataProviderOptions);

		if (this.options.simulation.enabled)
			await this.executeSimulation()
		else
			await this.executeStream();

		this.outputTrades();

		await dataProvider.close();
	}

	async executeSimulation() {

		// Get Processor Type from Algorithm factory
		const Processor = AlgorithmFactory.getProcessor(this.options.bot);

		// Set the start time to the simulated start time.
		this.options.state.time = this.options.simulation.start;

		while (this.options.state.time < this.options.simulation.end) {
			this.log(`Executing bot: ${this.options.bot}`);
			const bot = new Processor(dataProvider);
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
		}

	}

	async evaluateInstruction() {
		if (!this.options.state.evaluation) return false; 

		if (this.options.state.evaluation.action === 'buy') {
			this.log(`Received ${colors.black.bgGreen('BUY')} instruction @ ${this.options.state.evaluation.price}`);

			// Complete order;
			await this.placeOrder();
		}
		else if (this.options.state.evaluation.action === 'sell') {
			this.log(`Received ${colors.black.bgRed('SELL')} instruction @ ${this.options.state.evaluation.price}`);

			// Complete order;
			await this.placeSell();
		}

		return true;
	}

	async placeOrder() {
		const { price } = this.options.state.evaluation;

		if (this.options.simulation.enabled) {
			this.options.state.order = { price };
			this.options.state.evaluation = null;

			this.log(`Placed ${colors.black.bgGreen('BUY')} order @ ${price}`);
			this.log(`Successful ${colors.black.bgGreen('BUY')} order @ ${price}`);
		}
	}

	async placeSell() {
		const { price, buy } = this.options.state.evaluation;

		if (this.options.simulation.enabled) {
			this.options.state.order = null;
			this.options.state.evaluation = null;

			this.log(`Placed ${colors.black.bgRed('SELL')} order @ ${price}`);
			this.log(`Successful ${colors.black.bgRed('SELL')} order @ ${price}`);
		}

		this.history.push({ sell: price, buy });
	}

	async executeStream() {
		return;
	}

	outputTrades() {
		this.log();
		this.log(colors.bold('TRADE HISTORY'));
		this.log(colors.bold('============='));
		this.log();
		this.log(`Transaction Fee: ${this.options.config.txnFee}`);
		this.log();	

		if (this.history.length === 0) {
			this.log('  (No Trades)');
		}
		else {
			const totalProfit = [];
			this.history.forEach((item, i) => {
				this.log(`Trade #${i+1}`);
				this.log(`------------------------------------`);
				this.log(`${colors.bold('BUY:                   ')} ${item.buy}`);
				this.log(`${colors.bold('SELL:                  ')} ${item.sell}`);

				const preFeePerUnit = item.sell - item.buy;
				const preFeeProfit = item.sell / item.buy;
				//this.log(`Pre-fees Unit:          ${(preFeeProfit > 1) ? colors.green(preFeePerUnit.toFixed(10)) : colors.red(preFeePerUnit.toFixed(10))}`);
				//this.log(`Pre-fees Ratio:         ${(preFeeProfit > 1) ? colors.green(preFeeProfit.toFixed(4)) : colors.red(preFeeProfit.toFixed(4))}`);
				

				const txnFeePerUnit = parseFloat(item.sell) * parseFloat(this.options.config.txnFee);
				const postFeePerUnit = preFeePerUnit - txnFeePerUnit;
				const postFeeProfit = item.sell / (parseFloat(item.buy) + txnFeePerUnit);
				//this.log(`Transaction Fee / Unit: ${txnFeePerUnit.toFixed(10)}`);
				//this.log(`Post-fees Unit:         ${(postFeeProfit > 1) ? colors.green(postFeePerUnit.toFixed(10)) : colors.red(postFeePerUnit.toFixed(10))}`);
				this.log(`Post-fees Ratio:        ${(postFeeProfit > 1) ? colors.bold.green(postFeeProfit.toFixed(4)) : colors.bold.red(postFeeProfit.toFixed(4))}`);
				this.log();	

				totalProfit.push(postFeeProfit);
			});

			let overallProfit = 0;
			totalProfit.forEach(entry => overallProfit = overallProfit + entry);
			overallProfit = parseFloat(overallProfit) / totalProfit.length;
			this.log(`${colors.bold('Overall Profit:')}         ${(overallProfit > 1) ? colors.bold.green(overallProfit.toFixed(4)) : colors.bold.red(overallProfit.toFixed(4))}`);
		}

		this.log();	
	}

	log() {
		console.log(colors.black.bgCyan(' BotEngine '), ' ', ...arguments);
	}
}
