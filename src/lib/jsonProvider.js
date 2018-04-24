import fs from 'fs';
import path from 'path';
import colors from 'colors/safe';
import config from '../../config.json';

class mySqlProvider {

  log() {
    console.log(colors.black.bgBlue(' JsonLayer '), ' ', ...arguments);
  }

  initialise(rebuild, options) {
    this.log('Initialise JSON Data');
    this.models = {};
    
    return Promise.resolve();
  }

  close() {
    
  }

}

class TradeSelector {

  constructor(sqlProvider) {
    this.provider = sqlProvider;
  }

  create(dt, platform, symbol, price, volume) {
    const txn = {
        transactionStamp: dt,
        transactionDateTime: dt,
        platform,
        symbol,
        price,
        volume
    };

    return this.provider.models[`${symbol}_trades`].create(txn);
  }

  getByDateTimeRange(symbol, firstDate, lastDate) {
    return this.provider.models[`${symbol}_trades`].findAll({
      where: {
        symbol,
        transactionStamp: {
          [Op.gte]: firstDate,
          [Op.lte]: lastDate,
        }
      },
      order: [
        ['transactionStamp']
      ]
    });
  }

  getNext(symbol, dt, desc) {
    const dataset = this.provider.candlestickStore[symbol].data;
    const idx = dataset.findIndex(item => item.dt > dt);
    const record = (desc)
      ? dataset[idx-1]
      : dataset[idx];

    return [{
      transactionStamp: record.time,
      transactionDateTime: new Date(record.time * 1000),
      platform: 'NA',
      symbol,
      price: record.close,
      volume: null,
    }];
  }

}

class BotSelector {

  constructor(jsonProvider) {
    this.provider = jsonProvider;
    this.store = {};
  }

  upsert(msg) {
    msg.params = [];
    this.store[msg.key] = msg;
    return Promise.resolve(msg);
  }

  bulkCreateTrades(msgList) {
    throw new Error('Not Implemented 1');
  }

  bulkCreateParameters(msgList) {
    for (let i = 0; i < msgList.length; i++) {
        const item = msgList[i];
        this.store[item.botKey].params.push(item);
    }
    return Promise.resolve();
  }

}

class CandlestickSelector {

  constructor(sqlProvider) {
    this.provider = sqlProvider;
    this.provider.candlestickStore = {};
  }

  initialise(symbols) {
    for (const idx in symbols) {
      const symbol = symbols[idx];
      const file = path.join(__dirname, `./data/${symbol.toLowerCase()}.json`);
      const contents = fs.readFileSync(file).toString();
      const jsonData = JSON.parse(contents);

      this.provider.candlestickStore[symbol] = {
        start: new Date(jsonData.TimeFrom * 1000),
        end: new Date(jsonData.TimeTo * 1000),
        data: jsonData.Data.map(item => ({
          key: item.time,
          platform: 'FILE',
          symbol: symbol,
          period: 'd',
          dt: new Date(item.time * 1000),
          open: item.open,
          close: item.close,
          high: item.high,
          low: item.low,
          volume: item.volumefrom,
          assetVolume: item.volumeto,
          buyBaseVolume: null,
          buyAssetVolume: null,
        }))
      };
    }
  }

  hasData(symbol, period, useStart) {
    try {
      return (useStart) 
        ? (this.provider.candlestickStore[symbol].start <= period)
        : (this.provider.candlestickStore[symbol].end >= period);
    }
    catch (e) {
      return false;
    }
  }

  getByDateTimeRange(symbol, period, firstDate, lastDate) {
    return this.provider.candlestickStore[symbol].data.filter(item => item.dt >= firstDate && item.dt <= lastDate);
  }

  bulkCreate(msgList) {
    throw new Error('Not Implemented');
  }

  create(msg) {
    throw new Error('Not Implemented');
  }

}

const mySql = new mySqlProvider();
export default {
  _provider: mySql,
  trades: new TradeSelector(mySql),
  bot: new BotSelector(mySql),
  candlesticks: new CandlestickSelector(mySql),
  close: () => mySql.close(),
  initialise: (symbols, rebuild) => mySql.initialise(symbols, rebuild)
};