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

const buy_firstOffsetList = Array.from(Array(5).keys()).map(i => 12 + (i * 4));
const buy_firstRequiredIncreaseList = Array.from(Array(5).keys()).map(i => 1 + .005 + (i * 0.006));
const buy_secondOffsetList = Array.from(Array(4).keys()).map(i => 16 + (i * 8));
const buy_secondRequiredIncreaseList = Array.from(Array(5).keys()).map(i => 1 + .01 + (i * 0.012));

const sell_protectDecreaseList = Array.from(Array(4).keys()).map(i => 0.995 - (i * 0.0025));
const sell_firstOffsetList = Array.from(Array(5).keys()).map(i => 8 + (i * 4));
const sell_firstRequiredDecreaseList = Array.from(Array(5).keys()).map(i => 1 - .005 - (i * 0.008));
const sell_secondOffsetList = Array.from(Array(4).keys()).map(i => 16 + (i * 8));
const sell_secondRequiredDecreaseList = Array.from(Array(5).keys()).map(i => 1 - .01 - (i * 0.012));
const sell_timedProtectOffsetList = Array.from(Array(3).keys()).map(i => 20 + (i * 12));
const sell_timedProtectDecreaseList = Array.from(Array(4).keys()).map(i => 0.995 - (i * 0.0025));

/*
const buy_firstOffsetList = Array.from(Array(8).keys()).map(i => 16 + (i * 2));
const buy_firstRequiredIncreaseList = Array.from(Array(20).keys()).map(i => 1.004 + (i * 0.002));
const buy_secondOffsetList = Array.from(Array(12).keys()).map(i => 16 + (i * 4));
const buy_secondRequiredIncreaseList = Array.from(Array(30).keys()).map(i => 1.006 + (i * 0.003));

const sell_protectDecreaseList = Array.from(Array(20).keys()).map(i => 0.996 - (i * 0.0003));
const sell_firstOffsetList = Array.from(Array(8).keys()).map(i => 16 + (i * 2));
const sell_firstRequiredDecreaseList = Array.from(Array(20).keys()).map(i => 0.999 - (i * 0.0003));
const sell_secondOffsetList = Array.from(Array(12).keys()).map(i => 16 + (i * 6));
const sell_secondRequiredDecreaseList = Array.from(Array(20).keys()).map(i => 0.997 - (i * 0.0004))
const sell_timedProtectOffsetList = Array.from(Array(8).keys()).map(i => 25 + (i * 4));
const sell_timedProtectDecreaseList = Array.from(Array(20).keys()).map(i => 0.996 - (i * 0.0003));
*/

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

(async () => {

	await queueProvider.initialise(queueName);

	let routineCount = 0;

	const simulationList = [];
	const bucket = {};

	buy_firstOffset_loop:
	for (let buy_firstOffsetList_index = 0; buy_firstOffsetList_index < buy_firstOffsetList.length; buy_firstOffsetList_index++) {
		const buy_firstOffset = buy_firstOffsetList[buy_firstOffsetList_index];

	buy_firstRequiredIncrease_loop:
	for (let buy_firstRequiredIncreaseList_index = 0; buy_firstRequiredIncreaseList_index < buy_firstRequiredIncreaseList.length; buy_firstRequiredIncreaseList_index++) {
		const buy_firstRequiredIncrease = parseFloat(buy_firstRequiredIncreaseList[buy_firstRequiredIncreaseList_index]);

	buy_secondOffsetList_loop:
	for (let buy_secondOffsetList_index = 0; buy_secondOffsetList_index < buy_secondOffsetList.length; buy_secondOffsetList_index++) {
		const buy_secondOffset = buy_secondOffsetList[buy_secondOffsetList_index];
		if (buy_secondOffset <= buy_firstOffset) continue; // buy_secondOffsetList_loop;

	buy_secondRequiredIncreaseList_loop:
	for (let buy_secondRequiredIncreaseList_index = 0; buy_secondRequiredIncreaseList_index < buy_secondRequiredIncreaseList.length; buy_secondRequiredIncreaseList_index++) {
		const buy_secondRequiredIncrease = parseFloat(buy_secondRequiredIncreaseList[buy_secondRequiredIncreaseList_index]);
		if (buy_secondRequiredIncrease < buy_firstRequiredIncrease) continue; // buy_secondRequiredIncreaseList_loop;

	sell_protectDecrease_loop:
	for (let sell_protectDecreaseList_index = 0; sell_protectDecreaseList_index < sell_protectDecreaseList.length; sell_protectDecreaseList_index++) {
		const sell_protectDecrease = parseFloat(sell_protectDecreaseList[sell_protectDecreaseList_index]);

	sell_firstOffset_loop:
	for (let sell_firstOffsetList_index = 0; sell_firstOffsetList_index < sell_firstOffsetList.length; sell_firstOffsetList_index++) {
		const sell_firstOffset = sell_firstOffsetList[sell_firstOffsetList_index];

	sell_firstRequiredDecrease_loop:
	for (let sell_firstRequiredDecreaseList_index = 0; sell_firstRequiredDecreaseList_index < sell_firstRequiredDecreaseList.length; sell_firstRequiredDecreaseList_index++) {
		const sell_firstRequiredDecrease = parseFloat(sell_firstRequiredDecreaseList[sell_firstRequiredDecreaseList_index]);
		if (sell_firstRequiredDecrease <= sell_protectDecrease) continue sell_firstRequiredDecrease_loop;

	sell_secondOffsetList_loop:
	for (let sell_secondOffsetList_index = 0; sell_secondOffsetList_index < sell_secondOffsetList.length; sell_secondOffsetList_index++) {
		const sell_secondOffset = sell_secondOffsetList[sell_secondOffsetList_index];
		if (sell_secondOffset <= sell_firstOffset) continue sell_secondOffsetList_loop;

	sell_secondRequiredDecreaseList_loop:
	for (let sell_secondRequiredDecreaseList_index = 0; sell_secondRequiredDecreaseList_index < sell_secondRequiredDecreaseList.length; sell_secondRequiredDecreaseList_index++) {
		const sell_secondRequiredDecrease = parseFloat(sell_secondRequiredDecreaseList[sell_secondRequiredDecreaseList_index]);
		if (sell_secondRequiredDecrease > sell_firstRequiredDecrease) continue sell_secondRequiredDecreaseList_loop;
		if (sell_secondRequiredDecrease <= sell_protectDecrease) continue sell_secondRequiredDecreaseList_loop;

	sell_timedProtectOffsetList_loop:
	for (let sell_timedProtectOffsetList_index = 0; sell_timedProtectOffsetList_index < sell_timedProtectOffsetList.length; sell_timedProtectOffsetList_index++) {
		const sell_timedProtectOffset = sell_timedProtectOffsetList[sell_timedProtectOffsetList_index];

	sell_timedProtectDecreaseList_loop:
	for (let sell_timedProtectDecreaseList_index = 0; sell_timedProtectDecreaseList_index < sell_timedProtectDecreaseList.length; sell_timedProtectDecreaseList_index++) {
		const sell_timedProtectDecrease = parseFloat(sell_timedProtectDecreaseList[sell_timedProtectDecreaseList_index]);
		if (sell_timedProtectDecrease <= sell_protectDecrease) continue sell_timedProtectDecreaseList_loop;

		/* --------------------------- */

		//bucket[buy_firstRequiredIncrease] = (bucket[buy_firstRequiredIncrease]) ? ++bucket[buy_firstRequiredIncrease] : 1;

		const name = 
			`X_${bot}_` +
			`$_${startingBalance.toFixed(4)}_` +
			`F_${txnFee}_` +
			`B_${buy_firstOffset}_${buy_firstRequiredIncrease.toFixed(4)}_${buy_secondOffset}_${buy_secondRequiredIncrease.toFixed(4)}_` +
			`S_${sell_protectDecrease.toFixed(4)}_${sell_firstOffset}_${sell_firstRequiredDecrease.toFixed(4)}_${sell_secondOffset}_${sell_secondRequiredDecrease.toFixed(4)}_${sell_timedProtectOffset}_${sell_timedProtectDecrease.toFixed(4)}_` +
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

		simulationList.push(args);

		routineCount++;

		/* --------------------------- */

	}

	}

	}

	}

	}

	}

	}

	}

	}

	}

	}

	console.log('Routine Count:', routineCount);
	//console.log('Bucket:', bucket);

	const lst = shuffle(simulationList);//.reverse();



	for (let i = 0; i < lst.length; i++) {
		await queueProvider.publish(lst[i]);

		console.log(i, lst[i].name);

		//const engine = new BotEngine(args);
		//await engine.execute();
	}

})();



