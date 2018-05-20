import objectHelper from '../src/utils/objectHelper';
import BotEngine from '../src/engine';
const { Evaluator } = BotEngine;

require('dotenv').config();

const baseSymbol = 'BITTREX_SPOT_BTC_USDT'; // 'BINANCE_SPOT_BTC_USDT';
const symbol = 'BITTREX_SPOT_XRP_BTC'; // 'BINANCE_SPOT_XRP_BTC';

const defaultMessage = {
    "simulation": true,
    "symbol": symbol,
    
    "bot": [ "venom" ],
    
    "from": new Date("2016-09-01T00:00:00.000Z"),
    "to": new Date("2018-03-28T00:00:00.000Z"),

    "period": 86400,

    "data": "cryptoCandlestick",
    "recorder": [ 'dataRecorder' ],

    "wallet": {
        "USD": {
            "value": 1000,
            "buy": [ baseSymbol ],
            "sell": null
        },
        "BTC": {
            "value": 0,
            "buy": [ symbol ],
            "sell": [ baseSymbol ]
        },
        "XRP": {
            "value": 0,
            "buy": null,
            "sell": [ symbol ]
        }
    },

    "parameters": {
        "baseSymbol": baseSymbol,
        "buy": {
            "ma": 50,
            "offset": 1.0,
            "period": 9,
        },
        "sell": {
            "ma": 50,
            "offset": 0.94,
            "period": 0,
        }
    }
};

const log = {
    application: { write: () => {} },
    system: { write: () => {} }
}

describe('Resume Evaluation', () => {
    it('should resume bot evaluation', async () => {
        const message = objectHelper.deepClone(defaultMessage);
        await Evaluator.evaluate(message, log);
    });
});