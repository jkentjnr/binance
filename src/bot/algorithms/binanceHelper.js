import { EMA } from 'technicalindicators';

export default class BinanceHelper {

	static async getPriceAtTime(dataProvider, symbol, dt) {
		const dataset = await dataProvider.trades.getNext(symbol, dt, true);
		return (dataset && dataset.length > 0)
			? dataset[0].price
			: null;
	}

/*
	static async getRange(dataProvider, symbol, closeDate, lag) {
		const startDate = new Date(closeDate - (lag * 1000));
		console.log(closeDate);
		console.log(startDate, lag);

		const dataset = await dataProvider.trades.getByDateTimeRange(symbol, startDate, closeDate);
		return (dataset && dataset.length > 0)
			? dataset
			: [];
	}
*/
	static async calculateEmaRange(periodSeconds, dataset) {
		let dt = new Date(dataset[0].transactionDateTime);

		const rangeSet = [];
		const values = dataset.forEach((item, i) => {
			while (dt < item.transactionDateTime) {
				rangeSet.push(parseFloat(item.price));
				dt.setSeconds(dt.getSeconds() + 1);
			}
		});
		rangeSet.push(dataset[dataset.length-1].price);

		return EMA.calculate({period : periodSeconds, values : rangeSet});
	}

	static async calculateCurrentEma(periodSeconds, dataset) {
		const result = await BinanceHelper.calculateEmaRange(periodSeconds, dataset);
		return (result && result.length > 0) ? result[result.length-1] : null
	}

}