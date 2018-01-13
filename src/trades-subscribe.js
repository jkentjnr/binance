import dataProvider from './lib/dataProvider';
import queueProvider from './lib/queueProvider';

import config from '../config.json';

(async () => {

	await dataProvider.initialise(config.symbols, config.rebuild || false);

	await queueProvider.initialise(config.queue.name);

	queueProvider.subscribe(async (msg) => {
		try {
			console.log(`${msg.symbol} (${msg.eventTime}): ${msg.price} | Volume: ${msg.volume}`);

			const dt = new Date(msg.eventTime);
			await dataProvider.trades.create(dt, msg.platform, msg.symbol, msg.price, msg.volume);
		}
		catch(e) {
			console.log(e);
			return false;
		}

		return true;
	})

})();