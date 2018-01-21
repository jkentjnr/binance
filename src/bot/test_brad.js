import BotEngine from './engine';

const queueName = 'simulations';

const symbol = 'XRPBTC';
const bot = 'brad';
const startingBalance = 1;
const txnFee = 0.005;
const sleep = 30;
const fromDate = new Date(2018, 0, 18, 7, 0, 0, 0); // '20180114T090000'
const toDate = new Date(2018, 0, 18, 9, 0, 0, 0);  // '20180115T130000'

(async () => {

	const simulationList = [];
	const bucket = {};

/*
	const sample = 8;
	const shortPeriod = 7;
	const longPeriod = 25;

	const buy_velocityOffset = 10 * 60;
	const buy_velocity = 1.006;

	const sell_velocityOffset = 5 * 60;
	const sell_velocity = 0.995;
*/

	const sample = 8;
	const ema = 7;

	const buy_velocityOffset = 3 * 60;
	const buy_velocity = 1.004;

	const sell_velocityOffset = 2 * 60;
	const sell_velocity = 0.997;

	/* --------------------------- */

	const name = 
		`M_${bot}_` +
		`$_${startingBalance.toFixed(4)}_` +
		`F_${txnFee}_` +
		`EMA_${sample}_${ema}_` +
		`Z_${new Date().getTime()}`;

	const args = {
		symbol: symbol,
		bot: bot,
		simFrom: fromDate,
		simTo: toDate,
		name: name,
		sleep: sleep,
		txnFee: txnFee,
		startingBalance: startingBalance,
		parameters: {
			sample: sample,
			ema: ema,
			buy: [{
				duration: buy_velocityOffset,
				velocity: buy_velocity,
			}],
			sell: [{
				duration: sell_velocityOffset,
				velocity: sell_velocity,
			}]
		}
	};

	const engine = new BotEngine(args);
	await engine.execute();

})();



