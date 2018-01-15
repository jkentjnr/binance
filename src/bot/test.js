import BotEngine from './engine';
import queueProvider from '../lib/queueProvider';

const queueName = 'simulations';

const symbol = 'XRPBTC';
const bot = 'gary';
const startingBalance = 1;
const txnFee = 0.005;
const sleep = 3;
const fromDate = new Date(2018, 0, 14, 9, 0, 0, 0); // '20180114T090000'
const toDate = new Date(2018, 0, 15, 13, 0, 0, 0);  // '20180115T130000'

(async () => {

	await queueProvider.initialise(queueName);

	let routineCount = 0;

	const simulationList = [];
	const bucket = {};

	const buy_firstOffset = 15;
	const buy_firstRequiredIncrease = 1.005; //1.0015;
	const buy_secondOffset = 25;
	const buy_secondRequiredIncrease = 1.046;

	const sell_protectDecrease = 0.9875;
	
	const sell_firstOffset = 24;
	const sell_firstRequiredDecrease = 0.995;
	const sell_secondOffset = 32;
	const sell_secondRequiredDecrease = 0.99;

	const sell_timedProtectOffset = 44;
	const sell_timedProtectDecrease = 0.995;

	/* --------------------------- */

	//bucket[buy_firstRequiredIncrease] = (bucket[buy_firstRequiredIncrease]) ? ++bucket[buy_firstRequiredIncrease] : 1;

	const name = 
		`M_${bot}_` +
		`$_${startingBalance.toFixed(4)}_` +
		`F_${txnFee}_` +
		`B_${buy_firstOffset}_${buy_firstRequiredIncrease.toFixed(4)}_${buy_secondOffset}_${buy_secondRequiredIncrease.toFixed(4)}_` +
		`S_${sell_protectDecrease.toFixed(4)}_${sell_firstOffset}_${sell_firstRequiredDecrease.toFixed(4)}_${sell_secondOffset}_${sell_secondRequiredDecrease.toFixed(4)}_${sell_timedProtectOffset}_${sell_timedProtectDecrease.toFixed(4)}_` +
		`Z_${new Date().getTime()}`;

	console.log(routineCount, name);

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
			sell: {
				protect: {
					base: parseFloat(sell_protectDecrease.toFixed(4)),
					timed: {
						offset: sell_timedProtectOffset,
						change: parseFloat(sell_timedProtectDecrease.toFixed(4)),
					},
				},
				first: {
					offset: sell_firstOffset,
					change: parseFloat(sell_firstRequiredDecrease.toFixed(4)),
				},
				second: {
					offset: sell_secondOffset,
					change: parseFloat(sell_secondRequiredDecrease.toFixed(4)),
				}
			},
			buy: {
				first: {
					offset: buy_firstOffset,
					change: parseFloat(buy_firstRequiredIncrease.toFixed(4)),
				},
				second: {
					offset: buy_secondOffset,
					change: parseFloat(buy_secondRequiredIncrease.toFixed(4)),
				},
			}
		}
	}

	const engine = new BotEngine(args);
	await engine.execute();

})();



