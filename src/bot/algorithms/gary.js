import now from 'performance-now';
import colors from 'colors/safe';
import moment from 'moment';
import get from 'lodash.get';
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

		const { symbol } = options;
		const { time } = options.state;
		const { buy: buyPrice, buyTime } = options.state.order;

		let behaviour = null;

		const protectDecrease = parseFloat(get(options, 'parameters.sell.protect.base') || 0.99);

		const firstOffset = parseInt(get(options, 'parameters.sell.first.offset') || 30);
		const firstRequiredDecrease = parseFloat(get(options, 'parameters.sell.first.change') || 0.9985);
		const secondOffset = parseInt(get(options, 'parameters.sell.second.offset') || 90);
		const secondRequiredDecrease = parseFloat(get(options, 'parameters.sell.second.change') || 0.9958);

		const timedProtectOffset = parseFloat(get(options, 'parameters.sell.protect.timed.offset') || 30);
		const timedProtectDecrease = parseFloat(get(options, 'parameters.sell.protect.timed.base') || 0.996);

		const currentPrice = parseFloat(await binanceHelper.getPriceAtTime(this.dataProvider, symbol, time));
		this.log('CURRENT PRICE:', currentPrice.toFixed(10));

		const protectPrice = (buyPrice * protectDecrease);
		const protectAction = currentPrice < protectPrice;
		this.log(`1ST PROTECT:   ${protectPrice.toFixed(10)}          | ${(protectAction) ? colors.green('ACT') : colors.red('NO ACTION')}`);

		const firstStartRange = new Date(time - (firstOffset * 1000));
		const firstPrice = parseFloat(await binanceHelper.getPriceAtTime(this.dataProvider, symbol, firstStartRange));
		const firstAction = firstRequiredDecrease >= (currentPrice/firstPrice);
		this.log(`1ST PRICE:     ${firstPrice.toFixed(10)} | ${(currentPrice/firstPrice).toFixed(4)} | ${(firstAction) ? colors.green('ACT') : colors.red('NO ACTION')}`);

		const secondStartRange = new Date(time - (secondOffset * 1000));
		const secondPrice = parseFloat(await binanceHelper.getPriceAtTime(this.dataProvider, symbol, secondStartRange));
		const secondAction = secondRequiredDecrease >= (currentPrice/secondPrice);
		this.log(`2ND PRICE:     ${secondPrice.toFixed(10)} | ${(currentPrice/secondPrice).toFixed(4)} | ${(secondAction) ? colors.green('ACT') : colors.red('NO ACTION')}`);

		let timedProtectAction = false;
		if (buyTime && timedProtectDecrease && timedProtectOffset) {
			const timedProtectPrice = (buyPrice * timedProtectDecrease);
			timedProtectAction = (time >= new Date(buyTime + (timedProtectOffset * 1000))) && currentPrice < timedProtectPrice;
			this.log(`TIME PROTECT:  ${timedProtectPrice.toFixed(10)}          | ${(timedProtectAction) ? colors.green('ACT') : colors.red('NO ACTION')}`);
		}

		if (!behaviour && protectAction) behaviour = 'Base Protect Price';
		if (!behaviour && (firstAction && secondAction)) behaviour = 'Dual Range Breach';
		if (!behaviour && timedProtectAction) behaviour = 'Timed Protect Price';

		this.log(`RECOMMEND:     ${(firstAction && secondAction) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')}`);
		if (behaviour) {
			options.state.evaluation = {
				action: 'sell',
				volume: 1,
				price: currentPrice,
				time: new Date(time),
				behaviour,
			};
		}

		return options;
	}

	async buy(options) {

		this.log(`Mode: ${colors.cyan('EVALUATE BUY')}`);

		const { symbol } = options;
		const { time } = options.state;

		let behaviour = null;

		const firstOffset = parseInt(get(options, 'parameters.buy.first.offset') || 30);
		const firstRequiredIncrease = parseFloat(get(options, 'parameters.buy.first.change') || 1.0015);
		const secondOffset = parseInt(get(options, 'parameters.buy.second.offset') || 90);
		const secondRequiredIncrease = parseFloat(get(options, 'parameters.buy.second.change') || 1.0042);

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
		
		 if (!behaviour && (firstAction && secondAction)) behaviour = 'Dual Range Breach';

		this.log(`RECOMMEND:     ${(firstAction && secondAction) ? colors.bold.green('ACT') : colors.bold.red('NO ACTION')}`);
		if (firstAction && secondAction) {
			options.state.evaluation = {
				action: 'buy',
				volume: 1,
				price: currentPrice,
				time: new Date(time),
				behaviour,
			};
		}

		return options;	
	}

	log() {
		console.log(colors.black.bgYellow('  GaryBot  '), ' ', ...arguments);
	}
}