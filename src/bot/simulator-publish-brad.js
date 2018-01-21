import BotEngine from './engine';
import queueProvider from '../lib/queueProvider';

const queueName = 'simulations';

const symbol = 'XRPBTC';
const bot = 'brad';
const startingBalance = 1;
const txnFee = 0.005;
const sleep = 30;
//const fromDate = new Date(2018, 0, 13, 22, 0, 0, 0); // '20180114T090000'
const fromDate = new Date(2018, 0, 18, 7, 0, 0, 0); // '20180114T090000'
const toDate = new Date(2018, 0, 18, 9, 0, 0, 0);  // '20180115T130000'

const sampleList = [8]; // Array.from(Array(4).keys()).map(i => 8 + (i * 4));
const emaList = [3, 7, 15];

const buy_velocityOffset_1_List = [45,90,120,180,240]; //,90,120]; // Array.from(Array(4).keys()).map(i => (1 + i) * 40);
const buy_velocity_1_List = Array.from(Array(5).keys()).map(i => 1 + .004 + (i * 0.0015));

const buy_velocityOffset_2_List = [30,60,90,120]; //Array.from(Array(4).keys()).map(i => 8 + (i * 7));
const buy_velocity_2_List = Array.from(Array(5).keys()).map(i => 1 + .004 + (i * 0.0015));

const sell_velocityOffset_1_List = [20,45,90]; //,45,90]; //Array.from(Array(4).keys()).map(i => 8 + (i * 7));
const sell_velocity_1_List = Array.from(Array(5).keys()).map(i => 1 - .001 - (i * 0.0025));

const sell_velocityOffset_2_List = [15,30,45,90];//Array.from(Array(4).keys()).map(i => 8 + (i * 7));
const sell_velocity_2_List = Array.from(Array(5).keys()).map(i => 1 - .001 - (i * 0.0025));


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

	emaList_loop:
	for (let emaList_index = 0; emaList_index < emaList.length; emaList_index++) {
		const ema = parseInt(emaList[emaList_index]);

	buy_velocityOffset_1_List_loop:
	for (let buy_velocityOffset_1_List_index = 0; buy_velocityOffset_1_List_index < buy_velocityOffset_1_List.length; buy_velocityOffset_1_List_index++) {
		const buy_velocityOffset_1 = parseInt(buy_velocityOffset_1_List[buy_velocityOffset_1_List_index]);

	buy_velocity_1_List_loop:
	for (let buy_velocity_1_List_index = 0; buy_velocity_1_List_index < buy_velocity_1_List.length; buy_velocity_1_List_index++) {
		const buy_velocity_1 = parseFloat(buy_velocity_1_List[buy_velocity_1_List_index]);

	sell_velocityOffset_1_List_loop:
	for (let sell_velocityOffset_1_List_index = 0; sell_velocityOffset_1_List_index < sell_velocityOffset_1_List.length; sell_velocityOffset_1_List_index++) {
		const sell_velocityOffset_1 = parseInt(sell_velocityOffset_1_List[sell_velocityOffset_1_List_index]);

	sell_velocity_1_List_loop:
	for (let sell_velocity_1_List_index = 0; sell_velocity_1_List_index < sell_velocity_1_List.length; sell_velocity_1_List_index++) {
		const sell_velocity_1 = parseFloat(sell_velocity_1_List[sell_velocity_1_List_index]);

	let name = 
		`B_${bot}_` +
		`$_${startingBalance.toFixed(4)}_` +
		`F_${txnFee}_` +
		`EMA_${sample}_${ema}_` +
		`B_${buy_velocityOffset_1}_${buy_velocity_1}_` +
		`S_${sell_velocityOffset_1}_${sell_velocity_1}_` +
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
					duration: buy_velocityOffset_1,
					velocity: buy_velocity_1,
				}],
				sell: [{
					duration: sell_velocityOffset_1,
					velocity: sell_velocity_1,
				}]
			}
		}

		simulationList.push(args);

		routineCount++;

	buy_velocityOffset_2_List_loop:
	for (let buy_velocityOffset_2_List_index = 0; buy_velocityOffset_2_List_index < buy_velocityOffset_2_List.length; buy_velocityOffset_2_List_index++) {
		const buy_velocityOffset_2 = parseInt(buy_velocityOffset_2_List[buy_velocityOffset_2_List_index]);

	sell_velocityOffset_2_List_loop:
	for (let sell_velocityOffset_2_List_index = 0; sell_velocityOffset_2_List_index < sell_velocityOffset_2_List.length; sell_velocityOffset_2_List_index++) {
		const sell_velocityOffset_2 = parseInt(sell_velocityOffset_2_List[sell_velocityOffset_2_List_index]);

	buy_velocity_2_List_loop:
	for (let buy_velocity_2_List_index = 0; buy_velocity_2_List_index < buy_velocity_2_List.length; buy_velocity_2_List_index++) {
		const buy_velocity_2 = parseFloat(buy_velocity_2_List[buy_velocity_2_List_index]);
		if (buy_velocity_2 <= buy_velocity_1) continue;

	sell_velocity_2_List_loop:
	for (let sell_velocity_2_List_index = 0; sell_velocity_2_List_index < sell_velocity_2_List.length; sell_velocity_2_List_index++) {
		const sell_velocity_2 = parseFloat(sell_velocity_2_List[sell_velocity_2_List_index]);
		if (sell_velocity_2 >= sell_velocity_1) continue;

		/* --------------------------- */

		//bucket[buy_firstRequiredIncrease] = (bucket[buy_firstRequiredIncrease]) ? ++bucket[buy_firstRequiredIncrease] : 1;

	name = 
		`B_${bot}_` +
		`$_${startingBalance.toFixed(4)}_` +
		`F_${txnFee}_` +
		`EMA_${sample}_${ema}_` +
		`B_${buy_velocityOffset_1}_${buy_velocity_1}_${buy_velocityOffset_2}_${buy_velocity_2}_` +
		`S_${sell_velocityOffset_1}_${sell_velocity_1}_${sell_velocityOffset_2}_${sell_velocity_2}_` +
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
					duration: buy_velocityOffset_1,
					velocity: buy_velocity_1,
				},{
					duration: buy_velocityOffset_2,
					velocity: buy_velocity_2,
				}],
				sell: [{
					duration: sell_velocityOffset_1,
					velocity: sell_velocity_1,
				},{
					duration: sell_velocityOffset_2,
					velocity: sell_velocity_2,
				}]
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

	console.log('Routine Count:', routineCount);
	//console.log('Bucket:', bucket);

	const lst = shuffle(simulationList);//.reverse();

	for (let i = 0; i < lst.length; i++) {

		await queueProvider.publish(lst[i]);
		console.log(i, lst[i].name);

	}

})();



