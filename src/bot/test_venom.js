import BotEngine from './engine';

const queueName = 'simulations';

const baseSymbol = 'BTCUSD';
const symbol = 'XRPBTC';
const bot = 'venom';
const startingBalance = 1;
const txnFee = 0.005;
const sleep = 86400;
const fromDate = new Date(Date.UTC(2017, 3, 1, 0, 0, 0, 0));
const toDate = new Date(Date.UTC(2017, 6, 1, 0, 0, 0, 0));

(async () => {

	const ma = 50 * 86400;

    const buy_Offset = 1;
    const buy_PeriodOverEma = 5;

    const sell_Offset = 0.96;
    const sell_PeriodOverEma = 0;

	/* --------------------------- */

	const name = 
		`M_${bot}_` +
		`$_${startingBalance.toFixed(4)}_` +
		`F_${txnFee}_` +
		`MA_${ma}_` +
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
		wallet: {
			USD: {
				value: 1000,
				buy: [baseSymbol],
				sell: null
			},
			BTC: {
				value: 0,
				buy: [symbol],
				sell: [baseSymbol]
			},
			XRP: {
				value: 0,
				buy: null,
				sell: [symbol]
			}
		},
		parameters: {
            ma: ma,
			buy: {
				offset: buy_Offset,
				period: buy_PeriodOverEma,
			},
			sell: {
				offset: sell_Offset,
				period: sell_PeriodOverEma,
			}
		}
	};

	const engine = new BotEngine(args);
	await engine.execute();

})();

