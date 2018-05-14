import CryptoCandlestickProvider from './data/cryptoCandlestickProvider';

const dataProviders = {
	cryptoCandlestick: CryptoCandlestickProvider
}

export default class ProviderFactory {
    static getDataProviderList() {
		return Object.keys(dataProviders);
	}
	static async getDataProvider(message, log) {
		if (message && message.data && dataProviders[message.data]) {
			const dataProvider = dataProviders[message.data];
			await dataProvider.initialise(message, log);
			return dataProvider;
		}

		return null;
	}
}
