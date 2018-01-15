import BotEngine from './engine';
import queueProvider from '../lib/queueProvider';

import config from '../../config.json';

const queueName = 'simulations';

(async () => {

	await queueProvider.initialise(queueName, 1);

	queueProvider.subscribe(async (msg) => {
		try {
			// console.log(`msg`, msg);
			const engine = new BotEngine(msg);
			await engine.execute();
		}
		catch(e) {
			console.log(e);
			return false;
		}

		return true;
	});

})();