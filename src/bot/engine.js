import { Parser as Json2csvParser } from 'json2csv';
import moment from 'moment';
import colors from 'colors/safe';
import prettyjson from 'prettyjson';
import flatten from 'flat';
import path from 'path';
import fs from 'fs';
import Convert from 'ansi-to-html';

import dataFactory from '../lib/dataFactory';
import AlgorithmFactory from './algorithms';

const convertHtml = new Convert();

// Configure data provider
const dataProviderOptions = {};

export default class BotEngine {
	constructor(args) {
		
		const { symbol, bot:botName }= args;
		const txnFee = args.txnFee || 0.005;

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
		this.dataProvider = dataFactory.getProvider(args.processorData);

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
			batch: args.name || `${new Date().getTime()}_${botName}_${args.symbol}`,
			symbol: args.symbol,
			period: this.determinePeriod(args.period),
			periodSeconds: args.period,
			bot: botName,
			log: [],
			config: {
				sleep: args.sleep || args.period,
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
			parameters: {},
			response: {}
		};

		if (args.baseSymbol) {
			this.options.baseSymbol = args.baseSymbol;
		}

		if (args.parameters) {
			this.options.parameters = args.parameters;
		}

		if (args.storage) {
			this.options.storage = args.storage;
		}
		else {
			this.options.storage =  {
				S3: {
					region: process.env.S3_REGION,
					bucket: process.env.S3_BUCKET,
					path: process.env.S3_PATH
				}
			};
		}

		if (args.wallet) {
			this.options.wallet = args.wallet;
		}
		else {
			this.options.wallet = {
				"USD": {
					"value": 1000,
					"buy": [ args.baseSymbol ],
					"sell": null
				},
				"BTC": {
					"value": 0,
					"buy": [ args.symbol ],
					"sell": [ args.baseSymbol ]
				},
				"ALT": {
					"value": 0,
					"buy": null,
					"sell": [ args.symbol ]
				}
			};
		}

		this.printOptions();
	}

	async execute() {
		// Initialise data store and models
		await this.dataProvider.initialise(dataProviderOptions, false);
		this.log();

		await this.startDataLog();

		if (this.options.simulation.enabled)
			await this.executeSimulation()
		else
			await this.executeStream();

		this.options.timers.end = new Date();
		this.options.timers.timespan = this.options.timers.end.getTime() - this.options.timers.start.getTime();

		this.outputTrades();
		await this.endDataLog();

		await this.dataProvider.close();

		return this.options.response;
	}

	async executeSimulation() {

		// Get Processor Type from Algorithm factory
		const Processor = AlgorithmFactory.getProcessor(this.options.bot);

		// Set the start time to the simulated start time.
		this.options.state.time = new Date(this.options.simulation.start);

		// Create the bot.
		const bot = new Processor(this.dataProvider);

		let init = false;
		try {
			await bot.initialise(this.options, this._log.bind(this));
			init = true;
		}
		catch (e) {
			this.log('An Error Occurred:', e.message);
			this.options.response.statusCode = 404;
			this.options.response.error = e.message;
		}

		if (init) {
			let counter = 0;
			while (this.options.state.time < this.options.simulation.end) {
				this.log(`Executing bot: ${this.options.bot}`);

				this.options = await bot.evaluate(this.options);

				let hasInstruction = false;
				if (this.options.state.orders && this.options.state.orders.length > 0) {
					hasInstruction = await bot.execute(this.options, this.executeInstruction.bind(this));
				}
				
				// Simulate sleep.
				this.log(`Simulate sleep for ${this.options.config.sleep} second(s).`);
				this.options.state.time.setSeconds(this.options.state.time.getSeconds() + this.options.config.sleep);

				if (counter > 60) {
					await this.sleep(100);
					counter = 0;
				}
				else
					counter++;
			}

			this.log();
			this.log(`Execute Finalisation`);
			await bot.finalise(this.options, this.executeInstruction.bind(this));
		}
	}

	async executeInstruction(order, options) {
		let trade = null;

		if (order.action === 'buy') {
			this.log(`Received ${colors.black.bgGreen('BUY')} instruction @ ${order.price}`);

			// Complete order;
			trade = await this.placeBuy(order, options);


		}
		else if (order.action === 'sell') {
			this.log(`Received ${colors.black.bgRed('SELL')} instruction @ ${order.price}`);

			// Complete order;
			trade = await this.placeSell(order, options);
		}

		if (trade) {
			this.history.push(trade);
		}
	}

	getWallet(options, symbol, action) {
		for (const key in options.wallet) {
			const wallet = options.wallet[key];
			if (action === 'buy' && wallet.buy && wallet.buy.includes(symbol)) return wallet;
			if (action === 'sell' && wallet.sell && wallet.sell.includes(symbol)) return wallet;
		}

		throw new Error(`Wallet not found for ${action} ${symbol}`);
	}

	determinePeriod(period) {
		switch (period) {
			case 3600:  return '1HRS';
			case 14400: return '4HRS';
			case 86400: return '1DAY';
		}
		throw new Error('Invalid Period.');
	}

	async placeBuy(order, options) {
		let trade = null;

		const { symbol, time, action, volume, behaviour } = order;
		const price = parseFloat(order.price);

		const sourceWallet = this.getWallet(options, symbol, 'buy');
		const targetWallet = this.getWallet(options, symbol, 'sell');

		if (this.options.simulation.enabled) {

			if (sourceWallet.value > 0) {
				this.log();
				this.log('Starting Balance:        ', sourceWallet.value.toFixed(10));

				const permittedSpend = sourceWallet.value; // (100 * volume);
				const txnCost = permittedSpend * this.options.config.txnFee;
				const actualBalance = permittedSpend - txnCost;
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

				sourceWallet.value -= permittedSpend;
				targetWallet.value += quantity;

				this.log('Source Wallet:           ', sourceWallet.value.toFixed(10));
				this.log('Target Wallet:           ', targetWallet.value.toFixed(10));
				this.log();

				trade = {
					symbol,
					price,
					time,
					action,
					orderId: new Date().getTime().toString(),
					volume: quantity,
					behaviour: behaviour,
					value: permittedSpend,

					// TODO: Add and log balances at trade time.
				};
				
				this.log(`Placed ${colors.black.bgGreen('BUY')} order @ ${price}`);
				this.log(`Successful ${colors.black.bgGreen('BUY')} order @ ${price}`);
			}
			else {
				this.log(`${colors.red('Ignored')} ${colors.black.bgGreen('BUY')} order - not enough funds.`);
			}

			this.log();

		}
		
		return trade;

	}

	async placeSell(order, options) {
		let trade = null;

		const { symbol, time, action, volume, behaviour } = order;
		const price = parseFloat(order.price);

		const sourceWallet = this.getWallet(options, symbol, 'sell');
		const targetWallet = this.getWallet(options, symbol, 'buy');

		//console.log('sourceWallet', sourceWallet);
		//console.log('targetWallet', targetWallet);

		if (this.options.simulation.enabled) {
			if (sourceWallet.value > 0) {
				this.log();
				this.log('Starting Balance:        ', sourceWallet.value.toFixed(10));

				const quantity = sourceWallet.value; //(sourceWallet.value * volume);

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

				sourceWallet.value -= quantity;
				targetWallet.value += grossAmount;

				this.log('Source Wallet:           ', sourceWallet.value.toFixed(10));
				this.log('Target Wallet:           ', targetWallet.value.toFixed(10));
				this.log();

				trade = Object.assign({}, this.options.state.order, {
					symbol,
					price,
					time,
					action,
					orderId: new Date().getTime().toString(),
					volume: quantity,
					behaviour: behaviour,
					value: grossAmount,
				})

				this.log(`Placed ${colors.black.bgRed('SELL')} order @ ${price}`);
				this.log(`Successful ${colors.black.bgRed('SELL')} order @ ${price}`);
			}
			else {
				this.log(`${colors.red('Ignored')} ${colors.black.bgRed('SELL')} order - not enough coins.`);
			}

			this.log();
		}

		return trade;
	}

	async executeStream() {
		return;
	}

	outputTrades() {
		this.log();
		this.log(colors.bold('TRADE HISTORY'));
		this.log(colors.bold('============='));
		this.log();
		if (this.options.simulation.enabled) {
			this.log(`Simulation Start: ${moment(this.options.simulation.start).format('Do MMM YY h:mm:ss a')}`);
			this.log(`Simulation End:   ${moment(this.options.simulation.end).format('Do MMM YY h:mm:ss a')}`);
		}
		this.log(`Transaction Fee:  ${this.options.config.txnFee}`);
		this.log();	

		if (this.history.length === 0) {
			this.log('  (No Trades)');
		}
		else {
			this.history.forEach((item, i) => {
				this.log(`Trade #${i+1}`);
				this.log(`------------------------------------------------------------------------`);
				this.log(`${colors.bold('SYMBOL:                ')} ${item.symbol} (${moment(item.time).format('Do MMM YY h:mm:ss a')})`);
				this.log(`${colors.bold('ACTION:                ')} ${item.action.toUpperCase()}`);
				this.log(`Price:                  ${item.price.toFixed(10)}`);
				this.log(`Volume:                 ${item.volume.toFixed(10)}`);
				this.log(`Behaviour:              ${item.behaviour}`);
				this.log(`Value:                  ${item.value.toFixed(10)}`);
				this.log();	
			});
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
		if (process.env.SUPRESS_CONSOLE !== '1')
			console.log(...arguments);

		if (this.options) {
			const row = Array.prototype.join.call(arguments, ' ');
			const html = convertHtml.toHtml(row);
			//console.log(html);

			if (!this.options.console) this.options.console = [];
			this.options.console.push(html);
			
		}
	}

	async startDataLog() {
		// Implement Commit to Datastore logic	
	}

	async endDataLog() {

		this.options.response.trades = this.history;
		const htmlLog = `<html><head><style>body{background-color: black;font-family: monospace;white-space: pre;}p{margin:0;}</style><body>${Array.prototype.join.call(this.options.console.map(row => (`<p>${row}</p>`)), '')}</body></html>`;
		//console.log(htmlLog);

		if (this.options.storage && this.options.storage.S3) {
			const s3store = dataFactory.getStorage('s3');
			const folderPath = (this.options.storage.S3.path) ? `${this.options.storage.S3.path}/${this.options.batch}/` : `${this.options.batch}/`;

			if (this.options.log) {
				const csvOutput = new Json2csvParser().parse(this.options.log);
				this.options.response.csv = await s3store.write(this.options.storage.S3.bucket, `${folderPath}${this.options.batch}.csv`, csvOutput, { region: this.options.storage.S3.region });
			}

			if (this.options.console) {
				this.options.response.html = await s3store.write(this.options.storage.S3.bucket, `${folderPath}${this.options.batch}.html`, htmlLog, { region: this.options.storage.S3.region });
			}
		}

		// Implement Commit to Datastore logic
	}

	sleep(duration) {
		return new Promise(resolve => setTimeout(() => resolve(), duration));
	}

}
