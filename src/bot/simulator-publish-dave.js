import BotEngine from './engine';
import queueProvider from '../lib/queueProvider';

const queueName = 'simulations';

const symbol = 'XRPBTC';
const bot = 'dave';
const startingBalance = 1;
const txnFee = 0.005;
const sleep = 30;
const fromDate = new Date(2018, 0, 13, 22, 0, 0, 0); // '20180114T090000'
//const toDate = new Date(2018, 0, 13, 22, 10, 0, 0); // '20180114T090000'
const toDate = new Date(2018, 0, 16, 11, 30, 0, 0);  // '20180115T130000'
//const fromDate = new Date(2018, 0, 14, 16, 45, 0, 0); // '20180114T090000'
//const toDate = new Date(2018, 0, 14, 17, 30, 0, 0);  // '20180115T130000'

const sampleList = [8]; // Array.from(Array(4).keys()).map(i => 8 + (i * 4));
const shortPeriodList = [5,10,15,20,30];
const longPeriodList = [10,15,20,40,60];

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

	sampleList_loop:
	for (let sampleList_index = 0; sampleList_index < sampleList.length; sampleList_index++) {
		const sample = sampleList[sampleList_index];

	shortPeriodList_loop:
	for (let shortPeriodList_index = 0; shortPeriodList_index < shortPeriodList.length; shortPeriodList_index++) {
		const shortPeriod = parseInt(shortPeriodList[shortPeriodList_index]);

	longPeriodList_loop:
	for (let longPeriodList_index = 0; longPeriodList_index < longPeriodList.length; longPeriodList_index++) {
		const longPeriod = longPeriodList[longPeriodList_index];
		if (longPeriod <= shortPeriod) continue; // buy_secondOffsetList_loop;

		/* --------------------------- */

		//bucket[buy_firstRequiredIncrease] = (bucket[buy_firstRequiredIncrease]) ? ++bucket[buy_firstRequiredIncrease] : 1;

	const name = 
		`X_${bot}_` +
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
		}

		simulationList.push(args);

		routineCount++;

		/* --------------------------- */

	}

	}

	}

	console.log('Routine Count:', routineCount);
	//console.log('Bucket:', bucket);

	const lst = shuffle(simulationList);//.reverse();

	for (let i = 0; i < lst.length; i++) {
		await queueProvider.publish(lst[i]);
		console.log(i, lst[i].name);

	}

})();



