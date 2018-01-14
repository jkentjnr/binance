import now from 'performance-now';
import colors from 'colors/safe';
import moment from 'moment';
import binanceHelper from './binanceHelper';

export default class GaryBot {
	constructor(dataProvider) {
		this.dataProvider = dataProvider;
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

		return options;
	}

	async buy(options) {

		this.log(`Mode: ${colors.cyan('EVALUATE BUY')}`);

		const { symbol } = options;
		const { time } = options.state;

		const firstOffset = 30;
		const firstRequiredIncrease = 1.0015;
		const secondOffset = 90;
		const secondRequiredIncrease = 1.0042;

		const currentPrice = await binanceHelper.getPriceAtTime(this.dataProvider, symbol, time);
		this.log('CURRENT PRICE:', currentPrice);

		const firstStartRange = new Date(time - (firstOffset * 1000));
		const firstPrice = await binanceHelper.getPriceAtTime(this.dataProvider, symbol, firstStartRange);
		const firstAction = firstRequiredIncrease <= (currentPrice/firstPrice);
		this.log(`1ST PRICE:     ${firstPrice} | ${(currentPrice/firstPrice).toFixed(4)} | ${(firstAction) ? colors.green('ACT') : colors.red('NO ACTION')}`);

		const secondStartRange = new Date(time - (secondOffset * 1000));
		const secondPrice = await binanceHelper.getPriceAtTime(this.dataProvider, symbol, secondStartRange);
		const secondAction = secondRequiredIncrease <= (currentPrice/secondPrice);
		this.log(`2ND PRICE:     ${secondPrice} | ${(currentPrice/secondPrice).toFixed(4)} | ${(secondAction) ? colors.green('ACT') : colors.red('NO ACTION')}`);
		
		this.log(`RECOMMEND:     ${(firstAction && secondAction) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')}`);
		if (firstAction && secondAction) {
			options.state.evaluation = {
				action: 'buy',
				price: currentPrice
			};
		}

		return options;	
	}

	log() {
		console.log(colors.black.bgYellow('  GaryBot  '), ' ', ...arguments);
	}
}