import dataProvider from '../lib/dataProvider';
import binanceHelper from './algorithms/binanceHelper';

import config from '../../config.json';

// Configure data provider
const dataProviderOptions = {
	mode: ['trades', 'bot'],
	symbols: config.symbols
};

const symbol = 'XRPBTC';
const toDate = new Date(2018, 0, 14, 17, 30, 0, 0);  // '20180115T130000'
const offSetHours = 8;

const emaShortPeriod = 20;
const emaShortSeconds = emaShortPeriod * 60;

const emaLongPeriod = 80;
const emaLongSeconds = emaLongPeriod * 60;

(async () => {

	const offSetDate = new Date(toDate);
	offSetDate.setHours(offSetDate.getHours() - offSetHours);

	console.log(toDate);
	console.log(offSetDate);

	await dataProvider.initialise(config.rebuild || false, dataProviderOptions);

	const dataset = await dataProvider.trades.getByDateTimeRange(symbol, offSetDate, toDate);
	const currentPrice = dataset[dataset.length-1].price;

	const emaShortDataset = await binanceHelper.calculateCurrentEma(dataProvider, symbol, emaShortSeconds, dataset);
	const emaLongDataset  = await binanceHelper.calculateCurrentEma(dataProvider, symbol, emaLongSeconds, dataset);

	console.log('Price:', currentPrice)
	console.log('Short:', emaShortDataset);
	console.log('Long: ', emaLongDataset);

	await dataProvider.close();

})();



