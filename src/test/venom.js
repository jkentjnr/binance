import BotEngine from '../engine';

require('dotenv').config();

const baseSymbol = 'BITTREX_SPOT_BTC_USDT'; // 'BINANCE_SPOT_BTC_USDT';
const symbol = 'BITTREX_SPOT_XRP_BTC'; // 'BINANCE_SPOT_XRP_BTC';

const bot = 'venom';
const processorData = 'cryptoCandlestick';

const period = 86400;

const fromDate = new Date(Date.UTC(2017, 8, 1, 0, 0, 0, 0));
const toDate = new Date(Date.UTC(2018, 3, 1, 0, 0, 0, 0));

const ma = 50;

const buy_Offset = 1;
const buy_PeriodOverEma = 9;

const sell_Offset = 0.94;
const sell_PeriodOverEma = 0;

(async () => {

	const args = {
		simulation: true,
		"baseSymbol": "POLONIEX_SPOT_BTC_USDT",
		"symbol": "POLONIEX_SPOT_ETH_BTC",
	  
		"bot": "venom",
		
		"from": "2016-09-01T00:00:00.000Z",
		"to": "2018-03-28T00:00:00.000Z",
		period: period,
		data: processorData,
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
            baseSymbol: baseSymbol,
			buy: {
				ma: ma,
				offset: buy_Offset,
				period: buy_PeriodOverEma,
			},
			sell: {
				ma: ma,
				offset: sell_Offset,
				period: sell_PeriodOverEma,
			}
		}
	};

	const engine = new BotEngine();
	await engine.execute(args);

})();

