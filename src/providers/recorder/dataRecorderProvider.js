import get from 'lodash.get';
import flatten from 'flat';

import Sequelize from 'sequelize';
const Op = Sequelize.Op

class DataRecorderProvider {

    constructor() {
        //super();
        this.models = {};
    }

    async initialise(options, logger) {
        this.log = logger;

        this.sequelize = new Sequelize(process.env.DATABASE_SCHEMA, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD || null, {
            host: process.env.DATABASE_HOST,
            dialect: 'mysql',
            //logging: false, //this.log, //(process.env.LOGGING === 'true') ? console.log : false,
            logging: console.log,
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

        this.models.bot = this.sequelize.define(
            'bot', {
                key: { type: Sequelize.STRING(180), primaryKey: true },
                campaign: { type: Sequelize.STRING(100) },
                symbol: { type: Sequelize.STRING(10) },
                bot: { type: Sequelize.STRING(10) },
                startSimulation: { type: Sequelize.DATE },
                endSimulation: { type: Sequelize.DATE },
                executionTime: { type: Sequelize.BIGINT },
                startBalance: { type: Sequelize.DECIMAL(18,10) },
                endBalance: { type: Sequelize.DECIMAL(18,10) },
                profitLoss: { type: Sequelize.DECIMAL(18,10) },
                tradeCount: { type: Sequelize.INTEGER },
                profitTradeCount: { type: Sequelize.INTEGER },
                lossTradeCount: { type: Sequelize.INTEGER },
                profitTradePercentage: { type: Sequelize.DECIMAL(18,10) },
                startExecution: { type: Sequelize.DATE },
                endExecution: { type: Sequelize.DATE },
            }, {
                indexes: [{
                    fields: ['symbol']
                },{
                    fields: ['campaign']
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
/*
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
*/      

        return this.sequelize.sync();
    }

    close() {
        this.sequelize.close();
    }

    async setHeader(message, log) {

		const msg = {
            key: message.name,
            campaign: message.campaign || null,
            symbol: message.symbol,
            bot: message.bot,
            startSimulation: message.from,
			endSimulation: message.to,
            startBalance: get(message, 'execution.startBalance') || null,
            endBalance: get(message, 'execution.endBalance') || null,
            startExecution: get(message, 'execution.start') || null,
            endExecution: get(message, 'execution.end') || null,
            profitLoss: get(message, 'execution.profitLoss') || null,
            tradeCount: get(message, 'execution.tradeCount') || null,
            profitTradeCount: get(message, 'execution.profitTradeCount') || null,
            lossTradeCount: get(message, 'execution.lossTradeCount') || null,
		};

        await this.models.bot.upsert(msg);

        // ---------------

        if (message.parameters) {
            const flatParameterList = flatten(message.parameters);

            if (Object.keys(flatParameterList).length > 0) {
                const params = Object.keys(flatParameterList).map(key => ({
                    botKey: message.name,
                    name: key,
                    value: (flatParameterList[key] && flatParameterList[key].toString) ? flatParameterList[key].toString() : flatParameterList[key]
                }));
    
                await this.models.botParameters.bulkCreate(params);
            }
        }
    }
}

const provider = new DataRecorderProvider();
export default provider;