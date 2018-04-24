import Sequelize from 'sequelize';
const Op = Sequelize.Op

import colors from 'colors/safe';

import config from '../../config.json';

class mySqlProvider {

  log() {
    console.log(colors.black.bgBlue(' DataLayer '), ' ', ...arguments);
  }

  initialise(rebuild, options) {
    this.sequelize = new Sequelize(config.database.schema, config.database.user, config.database.password, {
        host: config.database.host,
        dialect: 'mysql',
        logging: false, //this.log, //(process.env.LOGGING === 'true') ? console.log : false,
        pool: {
          max: 10,
          min: 1,
          idle: 20000,
          evict: 20000,
          acquire: 20000
        },
        operatorsAliases: Op,
    });

    // now add the TIMESTAMP type 
    const TIMESTAMP = require('sequelize-mysql-timestamp')(this.sequelize, { warnings: false });

    this.models = {};

    if (options && options.mode && options.mode.includes('bot') === true) {
      this.models.bot = this.sequelize.define(
        'bot', {
          key: { type: Sequelize.STRING(200), primaryKey: true },
          symbol: { type: Sequelize.STRING(10) },
          bot: { type: Sequelize.STRING(10) },
          simulation: { type: Sequelize.BOOLEAN, defaultValue: false },
          startSimulation: { type: Sequelize.DATE },
          endSimulation: { type: Sequelize.DATE },
          executionTime: { type: Sequelize.BIGINT },
          startBalance: { type: Sequelize.DECIMAL(18,10) },
          endBalance: { type: Sequelize.DECIMAL(18,10) },
          endCoins: { type: Sequelize.DECIMAL(18,10) },
          compoundProfit: { type: Sequelize.DECIMAL(18,10) },
          tradeCount: { type: Sequelize.INTEGER },
          profitTradeCount: { type: Sequelize.INTEGER },
          lossTradeCount: { type: Sequelize.INTEGER },
          profitTradePercentage: { type: Sequelize.DECIMAL(18,10) },
          startExecution: { type: Sequelize.DATE },
          endExecution: { type: Sequelize.DATE },
        }, {
          indexes: [{
            fields: ['symbol']
          }]
        }
      );

      this.models.botParameters = this.sequelize.define(
        'botParameters', {
          name: { type: Sequelize.STRING(255) },
          value: { type: Sequelize.STRING(255) },
        }
      );
      this.models.bot.hasMany(this.models.botParameters, { as: 'parameters' })
      this.models.botParameters.belongsTo(this.models.bot, { onDelete: 'CASCADE' });

      this.models.botTrades = this.sequelize.define(
        'botTrades', {
          key: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          buy: { type: Sequelize.DECIMAL(18,10) },
          buyOrderId: { type: Sequelize.STRING(100) },
          buyTime: { type: Sequelize.DATE },
          buyVolume: { type: Sequelize.DECIMAL(18,10) },
          buyBehaviour: { type: Sequelize.STRING(100) },
          recommendedBuy: { type: Sequelize.DECIMAL(18,10) },
          recommendedBuyTime: { type: Sequelize.DATE },
          sell: { type: Sequelize.DECIMAL(18,10) },
          sellOrderId: { type: Sequelize.STRING(100) },
          sellTime: { type: Sequelize.DATE },
          sellVolume: { type: Sequelize.DECIMAL(18,10) },
          sellBehaviour: { type: Sequelize.STRING(100) },
          recommendedSell: { type: Sequelize.DECIMAL(18,10) },
          recommendedSellTime: { type: Sequelize.DATE },
          txnFeePerUnit: { type: Sequelize.DECIMAL(18,10) },
          preFeeProfitUnit: { type: Sequelize.DECIMAL(18,10) },
          postFeeProfitUnit: { type: Sequelize.DECIMAL(18,10) },
          preFeeProfit: { type: Sequelize.DECIMAL(18,10) },
          postFeeProfit: { type: Sequelize.DECIMAL(18,10) },
        }
      );
      this.models.bot.hasMany(this.models.botTrades, { as: 'trades' });
      this.models.botTrades.belongsTo(this.models.bot, { onDelete: 'CASCADE' });
    }

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
          volume: { type: Sequelize.DECIMAL(30,10) },
          assetVolume: { type: Sequelize.DECIMAL(30,10) },
          buyBaseVolume: { type: Sequelize.DECIMAL(30,10) },
          buyAssetVolume: { type: Sequelize.DECIMAL(30,10) },
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
    this.log('Force Rebuild Tables:', rebuild);
    return this.sequelize.sync({ force: rebuild })
      .then(() => this.log('Sync Tables: Success'));
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
    const operation = (desc === true) ? Op.lte : Op.gte;
    return this.provider.models[`${symbol}_trades`].findAll({
      limit: 1,
      where: {
        symbol,
        transactionStamp: {
          [operation]: dt
        }
      },
      order: [
        ['transactionStamp', (desc === true) ? 'DESC' : 'ASC']
      ]
    });
  }

}

class BotSelector {

  constructor(sqlProvider) {
    this.provider = sqlProvider;
  }

  upsert(msg) {
    const opts = { 
      include: [
        { model: this.provider.models.botParameters, as: 'parameters' },
        { model: this.provider.models.botTrades, as: 'trades' },
      ]
    };
    return this.provider.models.bot.upsert(msg, opts);
  }

  bulkCreateTrades(msgList) {
    return this.provider.models.botTrades.bulkCreate(msgList);
  }

  bulkCreateParameters(msgList) {
    return this.provider.models.botParameters.bulkCreate(msgList); 
  }

}

class CandlestickSelector {

  constructor(sqlProvider) {
    this.provider = sqlProvider;
  }

  getByDateTimeRange(symbol, period, firstDate, lastDate) {
    return this.provider.models.candlesticks.findAll({
      where: {
        symbol,
        period,
        dt: {
          [Op.gte]: firstDate,
          [Op.lte]: lastDate,
        }
      }
    });
  }

  bulkCreate(msgList) {
    return this.provider.models.candlesticks.bulkCreate(msgList);
  }

  create(msg) {
    return this.provider.models.candlesticks.create(msg);
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