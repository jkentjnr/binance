import CryptoCandlestickProvider from './cryptoCandlestickProvider';

import S3Storage from './s3Storage';

export default class DataFactory {
	static getProvider(key) {
		switch (key) {
			case 'cryptoCandlestick':
				return CryptoCandlestickProvider;
		}
		return CryptoCandlestickProvider;
	}

	static getStorage(key) {
		switch (key) {
			case 's3':
				return S3Storage;
		}
		return null;
	}
}
