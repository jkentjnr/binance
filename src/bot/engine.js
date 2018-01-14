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

		if (!symbol) throw new Error('You must specify a symbol eg. ETHBTC.');
		if (!botName) throw new Error('You must specify a bot eg. gary.');

		this.log(`Symbol: ${colors.bold(symbol)}`);
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

		this.options = {
			batch: args.name || `${botName}_${new Date().getTime()}`,
			symbol: args.symbol,
			bot: botName,
			config: {
				sleep: args.sleep || 3,
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

		return true;
	}

	async placeOrder() {
		const { price } = this.options.state.evaluation;

		if (this.options.simulation.enabled) {
			this.options.state.order = { price };
			this.options.state.evaluation = null;

			this.log(`Placed ${colors.black.bgGreen('BUY')} order @ ${price}`);
			this.log(`Successful ${colors.black.bgGreen('BUY')} order @ ${price}`);
			return;
		}
	}

	async executeStream() {
		return;
	}

	log() {
		console.log(colors.black.bgCyan(' BotEngine '), ' ', ...arguments);
	}
}
