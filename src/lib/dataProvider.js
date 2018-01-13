import Sequelize from 'sequelize';

import config from '../../config.json';

class mySqlProvider {

  initialise(rebuild, options) {
    this.sequelize = new Sequelize(config.database.schema, config.database.user, config.database.password, {
        host: config.database.host,
        dialect: 'mysql',
        logging: false, //(process.env.LOGGING === 'true') ? console.log : false,
        pool: {
          max: 10,
          min: 1,
          idle: 20000,
          evict: 20000,
          acquire: 20000
        }
    });

    // now add the TIMESTAMP type 
    const TIMESTAMP = require('sequelize-mysql-timestamp')(this.sequelize);

    this.models = {};

    if (options && options.mode && options.mode.includes('trades') === true && options.symbols) {
      options.symbols.forEach(symbol => {
        const key = `${symbol}_trades`;
        this.models[key] = this.sequelize.define(
          key, {
            transactionStamp: { type: TIMESTAMP, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            transactionDateTime: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            platform: { type: Sequelize.STRING(6) },
            symbol: { type: Sequelize.STRING(10) },
            price: { type: Sequelize.DECIMAL(18,10) },
            volume: { type: Sequelize.DECIMAL(18,10) },
          }, {
            indexes: [{
              fields: ['transactionStamp']
            }]
          }
        );
      });        
    }

    if (options && options.mode && options.mode.includes('candlesticks') === true) {
      this.models.candlesticks = this.sequelize.define(
        'candlesticks', {
          key: { type: Sequelize.STRING(30), primaryKey: true, autoIncrement: false },
          platform: { type: Sequelize.STRING(6) },
          symbol: { type: Sequelize.STRING(10) },
          period: { type: Sequelize.STRING(4) },
          dt: { type: Sequelize.DATE },
          open: { type: Sequelize.DECIMAL(18,10) },
          close: { type: Sequelize.DECIMAL(18,10) },
          high: { type: Sequelize.DECIMAL(18,10) },
          low: { type: Sequelize.DECIMAL(18,10) },
          volume: { type: Sequelize.DECIMAL(18,10) },
          assetVolume: { type: Sequelize.DECIMAL(18,10) },
          buyBaseVolume: { type: Sequelize.DECIMAL(18,10) },
          buyAssetVolume: { type: Sequelize.DECIMAL(18,10) },
        }, {
          timestamps: false,
          indexes: [{
            fields: ['symbol', 'period', 'dt']
          }]
        }
      );
    }

    return this.syncAndRebuildDatabase(rebuild);
  }

  close() {
    this.sequelize.close();
  }

  syncAndRebuildDatabase(rebuild) {
    console.log('Force Rebuild Tables:', rebuild);
    return this.sequelize.sync({ force: rebuild })
      .then(() => console.log('Sync Tables: Success'));
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

}

class CandlestickSelector {

  constructor(sqlProvider) {
    this.provider = sqlProvider;
  }

  upsert(msg) {
    return this.provider.models.candlesticks.upsert(msg);
  }

}

const mySql = new mySqlProvider();
export default {
  _provider: mySql,
  trades: new TradeSelector(mySql),
  candlesticks: new CandlestickSelector(mySql),
  close: () => mySql.close(),
  initialise: (symbols, rebuild) => mySql.initialise(symbols, rebuild)
};