import CryptoCandlestickProvider from './data/cryptoCandlestickProvider';

import RecorderProxy from './recorder/recorderProxy';
import DataRecorderProvider from './recorder/dataRecorderProvider';
import ConsoleRecorderProvider from './recorder/consoleRecorderProvider';

import SimulatorTraderProvider from './trader/simulatorTraderProvider';

const dataProviders = {
	cryptoCandlestick: CryptoCandlestickProvider
}

const recorderProviders = {
	dataRecorder: DataRecorderProvider,
	consoleRecorder: ConsoleRecorderProvider,
}

const traderProviders = {
	simulatorTrader: SimulatorTraderProvider
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

    static getRecorderProviderList() {
		return Object.keys(recorderProviders);
	}

	static async getRecorderProvider(message, log) {
		if (message && message.recorder) {
			
			const recorders = [];
			message.recorder.forEach(key => {
				if (recorderProviders[key]) {
					const recorder = recorderProviders[key];
					recorders.push(recorder);
				}
			});

			const recorderProxy = new RecorderProxy(recorders);
			await recorderProxy.initialise(message, log);

			return recorderProxy;
		}

		return null;
	}

    static getTraderProviderList() {
		return Object.keys(traderProviders);
	}

	static async getTraderProvider(message, log) {
		if (message && message.trader && traderProviders[message.trader]) {
			const TraderProvider = traderProviders[message.trader];
			const provider = new TraderProvider();
			
			await provider.initialise(message, log);
			return provider;
		}

		return null;
	}
}
