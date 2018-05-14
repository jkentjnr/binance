import Venom from './venom';

const bots = {
	venom: Venom
}

export default class AlgorithmFactory {
    static getBotList() {
		return Object.keys(bots);
	}
	static getBotProcessor(key) {
		const botKey = (key) ? key.toLowerCase() : null;
		if (botKey && bots[botKey])
			return bots[botKey];

		return null;
	}
}
