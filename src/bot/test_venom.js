import BotEngine from './engine';

require('dotenv').config();

const queueName = 'simulations';

const baseSymbol = 'BITTREX_SPOT_BTC_USDT'; // 'BINANCE_SPOT_BTC_USDT';
const symbol = 'BITTREX_SPOT_XRP_BTC'; // 'BINANCE_SPOT_XRP_BTC';
const bot = 'venom';
const processorData = 'cryptoCandlestick';

const txnFee = 0.005;
const period = 86400;

const fromDate = new Date(Date.UTC(2017, 8, 1, 0, 0, 0, 0)); //new Date(Date.UTC(2018, 1, 14, 0, 0, 0, 0));
const toDate = new Date(Date.UTC(2018, 3, 1, 0, 0, 0, 0));

const ma = 50;

const buy_Offset = 1;
const buy_PeriodOverEma = 9;

const sell_Offset = 0.94;
const sell_PeriodOverEma = 0;

(async () => {

	const name = 
		`M_${bot}_` +
		`CB_${baseSymbol}_` +
		`CS_${symbol}_` +
		`F_${txnFee}_` +
		`MA_${ma}_` +
		`Z_${new Date().getTime()}`;

	const args = {
		symbol: symbol,
		bot: bot,
		processorData: processorData,
		baseSymbol: baseSymbol,
		simFrom: fromDate,
		simTo: toDate,
		name: name,
		period: period,
		txnFee: txnFee,
		storage: {},
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

