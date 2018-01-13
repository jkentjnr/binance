import dataProvider from './lib/dataProvider';
import binanceProvider from './lib/binanceProvider';
import config from '../config.json';

const platform = 'BN';
const period = "3m";

const options = {
	mode: ['candlesticks']
};

(async () => {
	await dataProvider.initialise(config.rebuild || false, options);

	for (var i = 0; i < config.symbols.length; i++) {
		const symbol = config.symbols[i];

		try {
			const result = await binanceProvider.candlesticks(symbol, period);
			console.log(symbol, period, result.data.length);

			const item = result.data[result.data.length-1];

			for (var j = 0; j < result.data.length; j++) {
				const item = result.data[j];

				const msg = { 
					key: `${symbol}_${item.time}_${period}`,
					platform,
					symbol: result.symbol,
					period: result.period,
					dt: item.dt,
					open: item.open,
					close: item.close,
					high: item.high,
					low: item.low,
					volume: item.volume,
					assetVolume: item.assetVolume,
					buyBaseVolume: item.buyBaseVolume,
					buyAssetVolume: item.buyAssetVolume,
				};

				//console.log(JSON.stringify(msg));
				await dataProvider.candlesticks.upsert(msg);
				//console.log('upsert', msg.key);
			}

		}
		catch(e) {
			console.log(e);
		}
	}

	await dataProvider.close();

})();
