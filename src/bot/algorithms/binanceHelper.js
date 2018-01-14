
export default class BinanceHelper {

	static async getPriceAtTime(dataProvider, symbol, dt) {
		const dataset = await dataProvider.trades.getNext(symbol, dt, true);
		return (dataset && dataset.length > 0)
			? dataset[0].price
			: null;
	}

}