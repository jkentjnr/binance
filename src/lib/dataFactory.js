import CryptoCandlestickProvider from './cryptoCandlestickProvider';

export default class DataFactory {
	static getProvider(key) {
		switch (key) {
			case 'cryptoCandlestick':
				return CryptoCandlestickProvider;
		}
		return CryptoCandlestickProvider;
	}
}
