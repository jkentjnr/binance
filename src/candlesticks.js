import { ArgumentParser } from 'argparse';

import dataProvider from './lib/dataProvider';
import binanceProvider from './lib/binanceProvider';
import config from '../config.json';

// --------------------------------------------------------

const description = 'Binance Candlesticks Loader';

var parser = new ArgumentParser({ description, version: '0.0.1', addHelp:true });
parser.addArgument(['-p', '--period'], { help: 'The period the candlestick is for.', defaultValue: '1m', choices: ['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M'], dest: 'period' });
parser.addArgument(['-s', '--symbol'], { help: 'The binance pair eg. ETHBTC. Defaults to config file symbols.' });
const args = parser.parseArgs();

const platform = 'BN';
const period = args.period;
const symbols = (args.symbol) ? [].concat(args.symbol) : config.symbols;

// --------------------------------------------------------

const options = { mode: ['candlesticks'] };

console.log(`=====================================================\n`);
console.log(`${description.toUpperCase()}\n`);
console.log(`Period: ${period}\n`);
console.log(`Symbol(s):\n${symbols}\n`);
console.log(`=====================================================`);

(async () => {
	await dataProvider.initialise(config.rebuild || false, options);
	console.log(`=====================================================\n`);

	for (var i = 0; i < config.symbols.length; i++) {
		const symbol = config.symbols[i];

		console.log(`-----------------------------------------------------`);

		try {
			const result = await binanceProvider.candlesticks(symbol, period);

			const firstTime = result.data[0].dt;
			const lastTime = result.data[result.data.length-1].dt;

			console.log(`${result.symbol}: Period: ${period} | Result Count: ${result.data.length}`);
			console.log(`${result.symbol}: First Entry: ${firstTime}`);
			console.log(`${result.symbol}: Last Entry: ${lastTime}`);
			console.log(`${result.symbol}: Begin Time: ${new Date()}`);

			const existingRecords = await dataProvider.candlesticks.getByDateTimeRange(result.symbol, period, firstTime, lastTime);
			const keyList = (!existingRecords) ? [] : existingRecords.map(o => o.key);

			const newList = [];

			for (var j = 0; j < result.data.length; j++) {
				const item = result.data[j];
				const key = `${symbol}_${item.time}_${period}`;

				if (!keyList.find(o => o === key)) {
					const msg = { 
						key,
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

					newList.push(msg);
				}
			}

			if (newList.length > 0)
				await dataProvider.candlesticks.bulkCreate(newList);

			console.log(`${result.symbol}: Records Processed: ${newList.length}`);
			console.log(`${result.symbol}: End Time: ${new Date()}`);

		}
		catch(e) {
			console.log(e);
		}
	}

	await dataProvider.close();
	console.log(`=====================================================\n`);

})();
