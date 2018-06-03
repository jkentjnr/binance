import get from 'lodash.get';
import flatten from 'flat';
import RecorderBase from './recorderBase';

import Sequelize from 'sequelize';
const Op = Sequelize.Op

class DataRecorderProvider extends RecorderBase {

    constructor() {
        super();
        this.models = {};
    }

    async initialise(options, logger) {
        this.log = logger;

        this.sequelize = new Sequelize(process.env.DATABASE_SCHEMA, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD || null, {
            host: process.env.DATABASE_HOST,
            dialect: 'mysql',
            //logging: false, //this.log, //(process.env.LOGGING === 'true') ? console.log : false,
            logging: console.log,
            pool: { maxIdleTime: 50, max: 1, min: 1 },
            operatorsAliases: Op,
        });

        // now add the TIMESTAMP type 
        const TIMESTAMP = require('sequelize-mysql-timestamp')(this.sequelize, { warnings: false });

        this.models.bot = this.sequelize.define(
            'bot', {
                key: { type: Sequelize.STRING(180), primaryKey: true },
                campaign: { type: Sequelize.STRING(100) },
                symbol: { type: Sequelize.STRING(50) },
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

        this.models.botTrades = this.sequelize.define(
            'botTrades', {
                key: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
                symbol: { type: Sequelize.STRING(50) },
                action: { type: Sequelize.STRING(10) },
                time: { type: Sequelize.DATE },
                orderId: { type: Sequelize.STRING(50) },
                volume: { type: Sequelize.DECIMAL(18,10) },
                behaviour: { type: Sequelize.STRING(100) },
                value: { type: Sequelize.DECIMAL(18,10) },
            }
        );
        this.models.bot.hasMany(this.models.botTrades, { as: 'trades' });
        this.models.botTrades.belongsTo(this.models.bot, { onDelete: 'CASCADE' });


        return this.sequelize.sync(); 
    }

    async close(message) {
        if (get(message, 'config.closeDataConnections') === true) {
            await this.sequelize.close();
        }
    }

    async setHeader(message, log) {

		await this.upsertBotRecord(message, log);

        // ---------------

        let parameterList = [];

        if (message.parameters) {
            const flatParameterList = flatten(message.parameters);
            parameterList = Object.keys(flatParameterList).map(key => ({
                botKey: message.name,
                name: key,
                value: (flatParameterList[key] && flatParameterList[key].toString) ? flatParameterList[key].toString() : flatParameterList[key]
            }));
        }

        if (message.bot) {
            message.bot.forEach(value => parameterList.push({
                botKey: message.name,
                name: 'bot',
                value: value
            }));
        }

        if (parameterList.length > 0) {
            await this.models.botParameters.bulkCreate(parameterList);
        }
    }

    async setFooter(message, log) {

        await this.upsertBotRecord(message, log);
        
        // ---------------

        if (message.history && message.history.length > 0) {
            const tradeList = message.history.map(trade => Object.assign({}, { botKey: message.name }, trade));

            if (tradeList.length > 0) {
                await this.models.botTrades.bulkCreate(tradeList);
            }
        }

        // ---------------

        let parameterList = [];

        if (message.execution) {
            const flatExecutionList = flatten(message.execution);
            parameterList = Object.keys(flatExecutionList).map(key => ({
                botKey: message.name,
                name: `execution.${key}`,
                value: (flatExecutionList[key] && flatExecutionList[key].toString) ? flatExecutionList[key].toString() : flatExecutionList[key]
            }));
        }

        if (message.response) {
            const flatResponseList = flatten(message.response);
            Object.keys(flatResponseList).forEach(key => parameterList.push({
                botKey: message.name,
                name: `response.${key}`,
                value: (flatResponseList[key] && flatResponseList[key].toString) ? flatResponseList[key].toString() : flatResponseList[key]
            }));
        }

        if (parameterList.length > 0) {
            await this.models.botParameters.bulkCreate(parameterList);
        }
    }

    async upsertBotRecord(message, log) {

		const msg = {
            key: message.name,
            campaign: message.campaign || null,
            symbol: message.symbol,
            bot: message.bot.join('_'),
            startSimulation: message.from,
			endSimulation: message.to,
            startBalance: get(message, 'execution.startBalance') || null,
            endBalance: get(message, 'execution.endBalance') || null,
            startExecution: get(message, 'execution.start') || null,
            endExecution: get(message, 'execution.end') || null,
            executionTime: get(message, 'execution.executionTime') || null,
            profitLoss: get(message, 'execution.profitLoss') || null,
            tradeCount: get(message, 'execution.tradeCount') || null,
            profitTradeCount: get(message, 'execution.profitTradeCount') || null,
            profitTradePercentage: get(message, 'execution.profitTradePercentage') || null,
            lossTradeCount: get(message, 'execution.lossTradeCount') || null,
		};

        await this.models.bot.upsert(msg);
    }
}

const provider = new DataRecorderProvider();
export default provider;