import Sequelize from 'sequelize';
import colors from 'colors/safe';

import config from '../../config.json';

const Op = Sequelize.Op

class CryptoCandlestickProvider {

  log() {
    console.log(colors.black.bgBlue(' CryptoDat '), ' ', ...arguments);
  }

  initialise(options = {}, rebuild = false) {
    this.sequelize = new Sequelize(config.database.schema, config.database.user, config.database.password || null, {
        host: config.database.host,
        dialect: 'mysql',
        logging: false, //this.log, //(process.env.LOGGING === 'true') ? console.log : false,
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
  }

  getByDateTimeRange(symbol, period, firstDate, lastDate) {
    try {
      return this.provider.models.candlesticks.findAll({
        where: {
          symbol_id: symbol,
          period,
          date_period_start: {
            [Op.gte]: firstDate
          },
          date_period_end: {
            [Op.lte]: lastDate,
          }
        }
      });
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