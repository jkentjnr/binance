import BotEngine from './engine';

const queueName = 'simulations';

const symbol = 'XRPBTC';
const bot = 'dave';
const startingBalance = 1;
const txnFee = 0.005;
const sleep = 30;
const fromDate = new Date(2018, 0, 14, 9, 0, 0, 0); // '20180114T090000'
const toDate = new Date(2018, 0, 15, 13, 0, 0, 0);  // '20180115T130000'

(async () => {

	const simulationList = [];
	const bucket = {};

	const sample = 8;
	const shortPeriod = 20;
	const longPeriod = 80;

	/* --------------------------- */

	const name = 
		`M_${bot}_` +
		`$_${startingBalance.toFixed(4)}_` +
		`F_${txnFee}_` +
		`EMA_${sample}_${shortPeriod}_${longPeriod}_` +
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
			short: shortPeriod,
			long: longPeriod,
		}
	};

	const engine = new BotEngine(args);
	await engine.execute();

})();



