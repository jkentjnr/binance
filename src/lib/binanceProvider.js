import binance from 'node-binance-api';

import config from '../../config.json';

binance.options({
	'APIKEY': config.binance.key,
	'APISECRET': config.binance.secret,
	'test': config.binance.test || true
});

class BinanceProvider {
	candlesticks(symbol, period) {
		return new Promise((resolve, reject) => {
			binance.candlesticks(symbol, period, function(entry, symbol) {
				if (Array.isArray(entry) === false) {
					reject(Object.assign({}, entry, { symbol }));
				}
				else {
					resolve({
						symbol,
						period,
						created: new Date(),
						data: entry.map(item => {
							let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = item;
							return { dt: new Date(time), time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored };
						})
					});
				}
			});
		});
	}
}

export default new BinanceProvider();