import now from 'performance-now';
import colors from 'colors/safe';
import moment from 'moment';
import get from 'lodash.get';
import binanceHelper from './binanceHelper';
import memoryDataProvider from './memoryDataProvider';

export default class BradBot {
	constructor(dataProvider) {
		this.dataProvider = dataProvider;
	}

	async initialise(options, logger) {
		this.logger = logger;

		

		if (options.simulation.enabled) {
			// Override trades on data provider.

			const offsetHours = parseInt(get(options, 'parameters.sample') || 8); // Hours
			const offsetDate = moment(options.simulation.start).subtract(offsetHours, 'hours').toDate();

			this.dataProvider.trades.getByDateTimeRange = await memoryDataProvider.mockTradesGetByDateTimeRange(this.dataProvider, options.symbol, offsetDate, options.simulation.end);
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

		const sellParameters = get(options, 'parameters.sell') || [];

		const dataset = await this.determineEma(options);
		const emaCurrentShortPrice = dataset.emaRange[dataset.emaRange.length-1];

		let sellSignal = true;

		for (let i = 0; i < sellParameters.length; i++) {
			const sellParameter = sellParameters[i];

			const sellVelocityOffset = parseInt(sellParameter.duration || 60); // Seconds;
			const sellVelocityRequiredDecrease = parseFloat(sellParameter.velocity || 0.9999); // Percentage

			const emaSellPreviousShortPrice = dataset.emaRange[dataset.emaRange.length-sellVelocityOffset];
			const sellVelocity = (emaCurrentShortPrice / emaSellPreviousShortPrice);
			const sellThresholdCrossed = (sellVelocity) < sellVelocityRequiredDecrease;

			this.log(`CURRENT PRICE:  ${dataset.price.toFixed(10)}`);
			this.log(`CUR. SHORT EMA: ${emaCurrentShortPrice.toFixed(10)}`);
			this.log(`PRE. SHORT EMA: ${emaSellPreviousShortPrice.toFixed(10)}`);
			this.log(`VELOCITY:       ${sellVelocity.toFixed(5)} [${sellVelocityRequiredDecrease.toFixed(5)}]`);
			this.log(`THRESHOLD:      ${sellThresholdCrossed ? colors.bold('YES') : 'NO'}`);
			this.log();

			if (sellThresholdCrossed !== true) {
				sellSignal = false;
				break; 
			}
		}

		if (!behaviour && sellSignal) behaviour = 'EMA Short Decreasing';
		this.log(`RECOMMEND:      ${(behaviour) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')}`);

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

		const buyParameters = get(options, 'parameters.buy') || [];
		const sellParameters = get(options, 'parameters.sell') || [];

		const dataset = await this.determineEma(options);
		const emaCurrentShortPrice = dataset.emaRange[dataset.emaRange.length-1];

		let buySignal = true;

		for (let i = 0; i < buyParameters.length; i++) {
			const buyParameter = buyParameters[i];

			const buyVelocityOffset = parseInt(buyParameter.duration || 30); // Seconds;
			const buyVelocityRequiredIncrease = parseFloat(buyParameter.velocity || 1.006); // Percentage

			const emaBuyPreviousShortPrice = dataset.emaRange[dataset.emaRange.length-buyVelocityOffset];
			const buyVelocity = (emaCurrentShortPrice / emaBuyPreviousShortPrice);
			const buyThresholdCrossed = (buyVelocity) > buyVelocityRequiredIncrease;

			this.log(`CURRENT PRICE:  ${dataset.price.toFixed(10)}`);
			this.log(`CUR. SHORT EMA: ${emaCurrentShortPrice.toFixed(10)}`);
			this.log(`PRE. SHORT EMA: ${emaBuyPreviousShortPrice.toFixed(10)}`);
			this.log(`VELOCITY:       ${buyVelocity.toFixed(5)} [${buyVelocityRequiredIncrease.toFixed(5)}]`);
			this.log(`THRESHOLD:      ${buyThresholdCrossed ? colors.bold('YES') : 'NO'}`);
			this.log();

			if (buyThresholdCrossed !== true) {
				buySignal = false;
				break; 
			}

			this.log('INSTANT SELL CHECK');
			this.log();

			for (let j = 0; j < sellParameters.length; j++) {
				const sellParameter = sellParameters[j];

				const sellVelocityOffset = parseInt(sellParameter.duration || 60); // Seconds;
				const sellVelocityRequiredDecrease = parseFloat(sellParameter.velocity || 0.9999); // Percentage

				const emaSellPreviousShortPrice = dataset.emaRange[dataset.emaRange.length-sellVelocityOffset];
				const sellVelocity = (emaCurrentShortPrice / emaSellPreviousShortPrice);
				const sellThresholdCrossed = (sellVelocity) < sellVelocityRequiredDecrease;

				this.log(`PRE. SHORT EMA: ${emaSellPreviousShortPrice.toFixed(10)}`);
				this.log(`VELOCITY:       ${sellVelocity.toFixed(5)} [${sellVelocityRequiredDecrease.toFixed(5)}]`);
				this.log(`THRESHOLD:      ${sellThresholdCrossed ? colors.bold('YES') : 'NO'}`);
				this.log();

				if (sellThresholdCrossed === true) {
					buySignal = false;
					break; 
				}
			}
		}
	
		if (!behaviour && buySignal) behaviour = 'EMA Increase Threshold';

		this.log(`RECOMMEND:     ${(behaviour) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')} ${(supress === true) ? '(Suppression Active)' : ''}`);

		if (!hasExecuted) {
			// Initial EMA is to buy - we need a crossover so supress buy.
			options.state.supress = (!!behaviour);
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

		const emaPeriod = parseInt(get(options, 'parameters.ema') || 20); // Minutes;
		const emaSeconds = emaPeriod * 60;

		// ------------------------------------------------

		const offsetDate = new Date(time);
		offsetDate.setHours(time.getHours() - offsetHours);

		const dataset = await this.dataProvider.trades.getByDateTimeRange(symbol, offsetDate, time);
		const price = parseFloat(dataset[dataset.length-1].price);

		const emaRange = await binanceHelper.calculateEmaRange(emaSeconds, dataset);

		return {
			price,
			time,
			emaRange,
			emaPrice: emaRange[emaRange.length-1],
		};

	}

	log() {
		this.logger(colors.black.bgYellow('  BradBot  '), ' ', ...arguments);
	}

}