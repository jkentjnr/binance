import moment from 'moment';
import set from 'lodash.set';
import setWith from 'lodash.setwith';
import get from 'lodash.get';

export default class MemoryDataProvider {

	static async mockTradesGetByDateTimeRange(dataProvider, symbol, firstDate, lastDate) {
		const dataset = await dataProvider.trades.getByDateTimeRange(symbol, firstDate, lastDate);

		return (symbol, firstDate, lastDate) => {
			const start = dataset.findIndex(item => item.transactionDateTime >= firstDate);
			const end = dataset.findIndex(item => item.transactionDateTime > lastDate);

			return dataset.slice(start, end-1);
		};
	}

	static async mockTradesGetNext(dataProvider, symbol, start, end) {

		const dataset = await dataProvider.trades.getByDateTimeRange(symbol, start, end);
		const dateHash = (dt) => (`${dt.getFullYear()}.${dt.getMonth()}.${dt.getDay()}.${dt.getHours()}.${dt.getMinutes()}`);

		const cache = {};
		dataset.forEach(item => setWith(cache, dateHash(item.transactionDateTime), [], Object));
		dataset.forEach(item => get(cache, dateHash(item.transactionDateTime)).push(item));

		return (symbol, dt, desc) => {

			const equalToSeconds = (dt1, dt2) => {
				return (
					(dt1.getFullYear() === dt2.getFullYear()) &&
					(dt1.getMonth() === dt2.getMonth()) &&
					(dt1.getDay() === dt2.getDay()) &&
					(dt1.getHours() === dt2.getHours()) &&
					(dt1.getMinutes() === dt2.getMinutes()) &&
					(dt1.getSeconds() === dt2.getSeconds()));
			}

			let hash = dateHash(dt);
			let collection = get(cache, hash);

			if (dt < collection[0].transactionDateTime) {
				const o = new Date(dt);
				o.setMinutes(o.getMinutes() - 1);

				collection = get(cache, dateHash(o));
				return [collection[collection.length-1]];
			}

			if (dt > collection[collection.length-1].transactionDateTime) {
				return [collection[collection.length-1]];
			}

			const idx = collection.findIndex(item => item.transactionDateTime >= dt);

			let counter = (idx === 0) ? idx : idx - 1;
			let retVal = collection[counter];

			while (true) {
				counter++;
				if (counter >= collection.length) break;

				if (equalToSeconds(collection[counter].transactionDateTime, dt) === true) {
					retVal = collection[counter];
				}
				else {
					break;
				}
			}

			return [retVal];
		};
	}
}