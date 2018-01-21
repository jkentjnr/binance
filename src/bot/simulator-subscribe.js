import BotEngine from './engine';
import queueProvider from '../lib/queueProvider';

import colors from 'colors/safe';

import config from '../../config.json';

const queueName = 'simulations';

function log() {
	console.log(colors.black.bgRed(' Simulator '), ' ', ...arguments);
}

(async () => {

	await queueProvider.initialise(queueName, 1);

	queueProvider.subscribe(async (msg) => {
		try {
			const start = new Date();
			log(msg.name, start);
			
			const engine = new BotEngine(msg);
			//engine._log = () => { return; };

			await engine.execute();

			const end = new Date();
			log(msg.name, end.getTime() - start.getTime());
		}
		catch(e) {
			console.log(e);
			return false;
		}

		return true;
	});

})();