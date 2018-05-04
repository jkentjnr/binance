import BotEngine from './engine';

const queueName = 'simulations';

const baseSymbol = 'BINANCE_SPOT_BTC_USDT';
const symbol = 'BINANCE_SPOT_XRP_BTC';
const bot = 'venom';
const processorData = 'cryptoCandlestick';

const txnFee = 0.005;
const period = 86400;

const fromDate = new Date(Date.UTC(2018, 1, 14, 0, 0, 0, 0));
const toDate = new Date(Date.UTC(2018, 2, 28, 0, 0, 0, 0));

const ma = 50;

const buy_Offset = 1;
const buy_PeriodOverEma = 5;

const sell_Offset = 0.96;
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

