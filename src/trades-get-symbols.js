import binance from 'node-binance-api';
import request from 'request-promise-native';
import queueProvider from './lib/queueProvider';
import dataProvider from './lib/dataProvider';

import config from '../config.json';

const platform = 'BN';

binance.options({
	'APIKEY': config.binance.key,
	'APISECRET': config.binance.secret,
	'test': config.binance.test || true
});

Object.defineProperty(Array.prototype, 'chunk_inefficient', {
    value: function(chunkSize) {
        var array=this;
        return [].concat.apply([],
            array.map(function(elem,i) {
                return i%chunkSize ? [] : [array.slice(i,i+chunkSize)];
            })
        );
    }
});


const getDataStream = async () => {

	let tradesSocket = [];

	const data = await request.get('https://www.binance.com/api/v1/ticker/allBookTickers');
	//console.log(JSON.parse(data));

	const symbols = [];
	JSON.parse(data).forEach(item => { if (item.symbol && item.symbol.endsWith('BNB') === false && item.symbol !== '123456') symbols.push(item.symbol); });
	console.log(symbols);

	const options = { mode: ['trades'], symbols: symbols };

	//await dataProvider.initialise(config.rebuild || false, options);

	const arrs = symbols.chunk_inefficient(25);
	arrs.forEach(temparray => {

		console.log(temparray);
		tradesSocket.push(binance.websockets.trades(temparray, (trades) => {
			const { e:eventType, E:eventTime, s:symbol, p:price, q:volume, m:maker, a:tradeId } = trades;

			if (maker) {
				console.log(`${symbol} (${eventTime}): ${price} | Volume: ${volume}`);
				//queueProvider.publish({ eventTime, platform, symbol, price, volume });
			}
		}));
	});

	//await dataProvider.close();

	console.log(tradesSocket);

	return tradesSocket;

};


(async () => {

	console.log(await getDataStream())

})();