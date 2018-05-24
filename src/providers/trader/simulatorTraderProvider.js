import colors from 'colors/safe';
import botHelper from '../../utils/botHelper';

export default class SimulatorTraderProvider {

    async initialise(message, log) {

    }

    async dispatch(message, log) {

        // Does not need to dispatch to external platform for execution.
        return false;
    }

    async execute(message, log) {

        if (message.orders) {
			
            for (let i = 0; i < message.orders.length; i++) {
                let trade = null;
                const order = message.orders[i];

                if (order.action === 'buy') {
                    log.application.write(`Received ${colors.black.bgGreen('BUY')} instruction @ ${order.price}`);

                    // Complete order;
                    trade = await this.placeBuy(message, log, order);

                }
                else if (order.action === 'sell') {
                    log.application.write(`Received ${colors.black.bgRed('SELL')} instruction @ ${order.price}`);
					
                    // Complete order;
                    trade = await this.placeSell(message, log, order);
                }

                if (trade) {
                    message.history.push(trade);
                }
			}

			// Clear orders.
            message.orders = [];
        }

    }

	async placeBuy(message, log, order) {
		let trade = null;

		const { symbol, time, action, volume, behaviour } = order;
		const price = parseFloat(order.price);

		const sourceWallet = botHelper.getWallet(message, symbol, 'buy');
		const targetWallet = botHelper.getWallet(message, symbol, 'sell');

		if (message.simulation === true) {

			if (sourceWallet.value > 0) {
				log.application.write();
				log.application.write('Starting Balance:        ', sourceWallet.value.toFixed(10));

				const permittedSpend = sourceWallet.value; // (100 * volume);
				const txnCost = permittedSpend * message.config.txnFee;
				const actualBalance = permittedSpend - txnCost;
				const quantity = parseFloat(((actualBalance) / price).toFixed(4));

				log.application.write('Recommended Buy Price:   ', price.toFixed(10));
				log.application.write('% of Balance to be spent:', volume.toFixed(4));
				log.application.write('Actual Quantity:         ', quantity.toFixed(4));
				log.application.write();
				log.application.write('Total Authorised Spend:  ', permittedSpend.toFixed(10))
				log.application.write('- Transaction Fee:       ', txnCost.toFixed(10));
				log.application.write('= Purchase Amount:       ', actualBalance.toFixed(10));
				log.application.write();

				// Order placed.

				sourceWallet.value -= permittedSpend;
				targetWallet.value += quantity;

				log.application.write('Source Wallet:           ', sourceWallet.value.toFixed(10));
				log.application.write('Target Wallet:           ', targetWallet.value.toFixed(10));
				log.application.write();

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
				
				log.application.write(`Placed ${colors.black.bgGreen('BUY')} order @ ${price}`);
				log.application.write(`Successful ${colors.black.bgGreen('BUY')} order @ ${price}`);
			}
			else {
				log.application.write(`${colors.red('Ignored')} ${colors.black.bgGreen('BUY')} order - not enough funds.`);
			}

			log.application.write();

		}
		
		return trade;

    }
    
	async placeSell(message, log, order) {
		let trade = null;

		const { symbol, time, action, volume, behaviour } = order;
		const price = parseFloat(order.price);

		const sourceWallet = botHelper.getWallet(message, symbol, 'sell');
		const targetWallet = botHelper.getWallet(message, symbol, 'buy');

		// console.log('sourceWallet', sourceWallet);
		// console.log('targetWallet', targetWallet);

		if (message.simulation) {

			if (sourceWallet.value > 0) {
				log.application.write();
				log.application.write('Starting Balance:        ', sourceWallet.value.toFixed(10));

				const quantity = sourceWallet.value; //(sourceWallet.value * volume);

				const grossAmount = quantity * price;
				const txnCost = grossAmount * message.config.txnFee;
				const netAmount = grossAmount - txnCost;

				log.application.write('Recommended Sell Price:  ', price.toFixed(10));
				log.application.write('% of Balance to be spent:', volume.toFixed(4));
				log.application.write('Actual Quantity:         ', quantity.toFixed(4));
				log.application.write();
				log.application.write('Sale Amount:             ', grossAmount.toFixed(10));
				log.application.write('- Transaction Fee:       ', txnCost.toFixed(10));
				log.application.write('= Net Amount:            ', netAmount.toFixed(10));
				log.application.write();

				// Order placed.

				sourceWallet.value -= quantity;
				targetWallet.value += netAmount; //grossAmount;

				log.application.write('Source Wallet:           ', sourceWallet.value.toFixed(10));
				log.application.write('Target Wallet:           ', targetWallet.value.toFixed(10));
				log.application.write();

				trade = {
					symbol,
					price,
					time,
					action,
					orderId: new Date().getTime().toString(),
					volume: quantity,
					behaviour: behaviour,
					value: netAmount, // grossAmount,
				};

				log.application.write(`Placed ${colors.black.bgRed('SELL')} order @ ${price}`);
				log.application.write(`Successful ${colors.black.bgRed('SELL')} order @ ${price}`);
			}
			else {
				log.application.write(`${colors.red('Ignored')} ${colors.black.bgRed('SELL')} order - not enough coins.`);
			}

			log.application.write();
		}

		return trade;
	}
}