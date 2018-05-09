import Sequelize from 'sequelize';
import colors from 'colors/safe';

const Op = Sequelize.Op

class CryptoCandlestickProvider {

  log() {
    console.log(colors.black.bgBlue(' CryptoDat '), ' ', ...arguments);
  }

  initialise(options = {}, rebuild = false) {
    this.sequelize = new Sequelize(process.env.DATABASE_SCHEMA, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD || null, {
        host: process.env.DATABASE_HOST,
        dialect: 'mysql',
        logging: false, //this.log, //(process.env.LOGGING === 'true') ? console.log : false,
        //logging: console.log,
        pool: {
          max: 10,
          min: 1,
          //idle: 20000,
          //evict: 20000,
          //acquire: 20000
        },
        operatorsAliases: Op,
    });

    // now add the TIMESTAMP type 
    const TIMESTAMP = require('sequelize-mysql-timestamp')(this.sequelize, { warnings: false });

    this.models = {};

    this.models.candlesticks = this.sequelize.define(
      'candlesticks', {
        symbol_id: { type: Sequelize.STRING(50) },
        period: { type: Sequelize.STRING(10) },
        date_period_start: { type: Sequelize.DATE },
        date_period_end: { type: Sequelize.DATE },
        time_period_start: { type: Sequelize.TIME },
        time_period_end: { type: Sequelize.TIME },
        time_open: { type: Sequelize.TIME },
        time_close: { type: Sequelize.TIME },
        px_open: { type: Sequelize.DECIMAL(18,8) },
        px_high: { type: Sequelize.DECIMAL(18,8) },
        px_low: { type: Sequelize.DECIMAL(18,8) },
        px_close: { type: Sequelize.DECIMAL(18,8) },
        sx_cnt: { type: Sequelize.INTEGER },
        sx_sum: { type: Sequelize.DECIMAL(10,8) },
        tx_day: { type: Sequelize.DATEONLY }
      }, {
        timestamps: false
      }
    );
    this.models.candlesticks.removeAttribute('id');

    return this.syncAndRebuildDatabase(rebuild);
  }

  close() {
    this.sequelize.close();
  }

  syncAndRebuildDatabase(rebuild) {
    this.log('Force Rebuild Tables:', rebuild);
    return this.sequelize.sync({ force: rebuild })
      .then(() => this.log((rebuild) ? 'Sync Tables: Success' : 'Sync Tables: Skipped'));
  }

}

class CandlestickSelector {

  constructor(sqlProvider) {
    this.provider = sqlProvider;
    this.cachedData = {};
  }

  async initialise(symbol, period, firstDate, lastDate) {
    const data = await this.getByDateTimeRangeRequest(symbol, period, firstDate, lastDate);
    this.cachedData[symbol] = data;
  }

  getNext(symbol, dt, desc) {
    if (desc) {
      return this.cachedData[symbol].find(item => item.date_period_start >= dt);
    }
    else {
      this.cachedData[symbol].reverse();
      const result = this.cachedData[symbol].find(item => item.date_period_start >= dt);
      this.cachedData[symbol].reverse();
      return result;
    }
  }

  getNextRequest(symbol, dt, desc) {
    const operation = (desc === true) ? Op.lte : Op.gte;
    return this.provider.models.candlesticks.findAll({
      limit: 1,
      where: {
        symbol_id: symbol,
        date_period_start: {
          [operation]: dt
        }
      },
      order: [
        ['date_period_start', (desc === true) ? 'DESC' : 'ASC']
      ],
      raw: true,
    });
  }

  getByDateTimeRange(symbol, period, firstDate, lastDate) {
    return this.cachedData[symbol].filter(item => item.date_period_start >= firstDate && item.date_period_end <= lastDate);
  }

  getByDateTimeRangeRequest(symbol, period, firstDate, lastDate) {
    try {
      const query = {
        where: {
          symbol_id: symbol,
          period,
          date_period_start: {
            [Op.gte]: firstDate
          },
          date_period_end: {
            [Op.lte]: lastDate,
          }
        },
        order: [
          ['date_period_start', 'ASC']
        ],
        raw: true,
      };
      return this.provider.models.candlesticks.findAll(query);
    }
    catch(e) {
      console.log('err', e);
    }
  }

}

const provider = new CryptoCandlestickProvider();

export default {
  _provider: provider,
  candlesticks: new CandlestickSelector(provider),
  close: () => provider.close(),
  initialise: (symbols, rebuild) => provider.initialise(symbols, rebuild)
};