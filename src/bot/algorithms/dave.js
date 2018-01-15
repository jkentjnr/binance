import now from 'performance-now';
import colors from 'colors/safe';
import moment from 'moment';
import get from 'lodash.get';
import binanceHelper from './binanceHelper';

export default class DaveBot {
	constructor(dataProvider) {
		this.dataProvider = dataProvider;
	}

	async initialise(options, logger) {
		this.logger = logger;

		if (options.simulation.enabled) {
			// Override trades on data provider.

			const offsetHours = parseInt(get(options, 'parameters.sample') || 8); // Hours
			const offsetDate = new Date(options.simulation.start);
			offsetDate.setHours(options.simulation.start.getHours() - offsetHours);

			const dataset = await this.dataProvider.trades.getByDateTimeRange(options.symbol, offsetDate, options.simulation.end);

			this.dataProvider.trades.getByDateTimeRange = async (symbol, firstDate, lastDate) => {
				const start = dataset.findIndex(item => item.transactionDateTime >= firstDate);
				const end = dataset.findIndex(item => item.transactionDateTime > lastDate);

				return dataset.slice(start, end-1);
			};
		}
	}

	async execute(options) {

		this.startTime = now();
		this.log(`-------------------------------------------------`);
		this.log(`Instruction Received`);
		this.log(`Evaluate Period - ${moment(options.state.time).format('Do MMM YY h:mm:ss a')}`);

		let result = options;
		if (options.state) {
			if (options.state.order) {
				result = await this.sell(options);
			}
			else {
				result = await this.buy(options);
			}
		}

		this.endTime = now();
		this.log(`Processing Time - ${((this.endTime - this.startTime) / 1000).toFixed(4)} second(s).`);
		this.log(`-------------------------------------------------`);

		return result;
	}

	async sell(options) {
		this.log(`Mode: ${colors.magenta('EVALUATE SELL')}`);

		const { symbol } = options;
		const { time } = options.state;
		const { buy: buyPrice, buyTime } = options.state.order;

		let behaviour = null;

		const dataset = await this.determineEma(options);

		this.log(`CURRENT PRICE: ${dataset.price.toFixed(10)}`);
		this.log(`SHORT EMA:     ${dataset.emaShortPrice.toFixed(10)}`);
		this.log(`LONG EMA:      ${dataset.emaLongPrice.toFixed(10)}`);

		if (!behaviour && (dataset.emaLongPrice > dataset.emaShortPrice)) behaviour = 'EMA Long > Short';
		this.log(`RECOMMEND:     ${(behaviour) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')}`);

		if (behaviour) {
			options.state.evaluation = {
				action: 'sell',
				volume: 1,
				price: dataset.price,
				time: new Date(time),
				behaviour,
			};
		}

		return options;
	}

	async buy(options) {

		this.log(`Mode: ${colors.cyan('EVALUATE BUY')}`);

		const { symbol } = options;
		const { time, hasExecuted, supress } = options.state;

		let behaviour = null;

		const dataset = await this.determineEma(options);

		this.log(`CURRENT PRICE: ${dataset.price.toFixed(10)}`);
		this.log(`SHORT EMA:     ${dataset.emaShortPrice.toFixed(10)}`);
		this.log(`LONG EMA:      ${dataset.emaLongPrice.toFixed(10)}`);
	
		if (!behaviour && (dataset.emaShortPrice > dataset.emaLongPrice)) behaviour = 'EMA Short > Long';
		this.log(`RECOMMEND:     ${(behaviour) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')}`);

		if (!hasExecuted) {
			// Initial EMA is to buy - we need a crossover so supress buy.
			options.state.supress = (behaviour);
			options.state.hasExecuted = true;
			return options;
		}

		// Supress buy if instruction say to buy.
		if (behaviour && supress) return options;

		// Remove supression as not currently indicating buy.
		if (!behaviour && supress) {
			options.state.supress = false;
			return options;
		}

		if (behaviour) {
			options.state.evaluation = {
				action: 'buy',
				volume: 1,
				price: dataset.price,
				time: new Date(time),
				behaviour,
			};
		}

		return options;	
	}

	async determineEma(options) {

		const { symbol } = options;
		const { time } = options.state;

		const offsetHours = parseInt(get(options, 'parameters.sample') || 8); // Hours

		const emaShortPeriod = parseInt(get(options, 'parameters.short') || 20); // Minutes;
		const emaShortSeconds = emaShortPeriod * 60;

		const emaLongPeriod = parseInt(get(options, 'parameters.long') || 60); // Minutes;
		const emaLongSeconds = emaLongPeriod * 60;

		// ------------------------------------------------

		const offsetDate = new Date(time);
		offsetDate.setHours(time.getHours() - offsetHours);

		const dataset = await this.dataProvider.trades.getByDateTimeRange(symbol, offsetDate, time);
		const price = parseFloat(dataset[dataset.length-1].price);

		const emaShortPrice = await binanceHelper.calculateCurrentEma(emaShortSeconds, dataset);
		const emaLongPrice  = await binanceHelper.calculateCurrentEma(emaLongSeconds, dataset);

		return {
			price,
			time,
			emaShortPrice,
			emaLongPrice,
		};

	}

	log() {
		this.logger(colors.black.bgYellow('  DaveBot  '), ' ', ...arguments);
	}

}