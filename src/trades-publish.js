import binance from 'node-binance-api';
import queueProvider from './lib/queueProvider';

import config from '../config.json';

const platform = 'BN';

binance.options({
	'APIKEY': config.binance.key,
	'APISECRET': config.binance.secret,
	'test': config.binance.test || true
});


(async () => {

	await queueProvider.initialise(config.queue.name);

	binance.websockets.trades(config.symbols, (trades) => {
		const { e:eventType, E:eventTime, s:symbol, p:price, q:volume, m:maker, a:tradeId } = trades;

		if (maker) {
			console.log(`${symbol} (${eventTime}): ${price} | Volume: ${volume}`);
			queueProvider.publish({ eventTime, platform, symbol, price, volume });
		}
	});

})();