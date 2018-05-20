import Venom from './venom';

const bots = {
	venom: Venom
}

export default class AlgorithmFactory {
    static getBotList() {
		return Object.keys(bots);
	}

	static getBotProcessor(req) {
		const res = [];
		const botRequest = [].concat(req);

		botRequest.forEach(key => {
			const botKey = (key) ? key.toLowerCase() : null;
			if (botKey && bots[botKey]) {
				const BotProcessor = bots[botKey];
				res.push(new BotProcessor());
			}
		});

		return res;
	}
}
