import BotEngine from '../engine';

require('dotenv').config();

const baseSymbol = 'POLONIEX_SPOT_BTC_USDT'; // 'BINANCE_SPOT_BTC_USDT';
const symbol = 'POLONIEX_SPOT_ETH_BTC'; // 'BINANCE_SPOT_XRP_BTC';

const bot = 'venom';
const processorData = 'cryptoCandlestick';
const processorTrader = 'simulatorTrader';

const period = 86400;

const fromDate = new Date(Date.UTC(2017, 8, 1, 0, 0, 0, 0));
const toDate = new Date(Date.UTC(2018, 3, 1, 0, 0, 0, 0));

const buy_ma = 60;
const buy_Offset = 1;
const buy_PeriodOverEma = 11;

const sell_ma = 40;
const sell_Offset = 0.94;
const sell_PeriodOverEma = 2;

(async () => {

	/*
	const args = {
		simulation: true,
		symbol: 'POLONIEX_SPOT_ETH_BTC',
		bot: [ 'venom' ],
		
		from: '2016-09-01T00:00:00.000Z',
		to: '2018-03-28T00:00:00.000Z',
		period: period,
		data: processorData,
		trader: processorTrader,
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
		recorder: ['dataRecorder', 'consoleRecorder'],
		config: {
			closeDataConnections: true
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
	*/

	const args = {
		simulation: true,
		symbol: 'POLONIEX_SPOT_ETH_BTC',
		bot: [ 'venom' ],
		
		from: '2017-01-01T00:00:00.000Z',
		to: '2018-04-01T00:00:00.000Z',
		period: period,
		data: processorData,
		trader: processorTrader,
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
		recorder: ['dataRecorder', 'consoleRecorder'],
		config: {
			closeDataConnections: true
		},
		parameters: {
            baseSymbol: baseSymbol,
			buy: {
				ma: buy_ma,
				offset: buy_Offset,
				period: buy_PeriodOverEma,
			},
			sell: {
				ma: sell_ma,
				offset: sell_Offset,
				period: sell_PeriodOverEma,
			}
		}
	};

    const log = {
        application: { write: (a,b,c,d,e,f,g,h,i) => console.log('APPLICATION', a||'',b||'',c||'',d||'',e||'',f||'',g||'',h||'',i||'') },
        system: { write: (a,b,c,d,e,f,g,h,i) => console.log('SYSTEM', a||'',b||'',c||'',d||'',e||'',f||'',g||'',h||'',i||'') }
    }

	const engine = new BotEngine();
	await engine.execute(args, log);

})();

