import 'babel-polyfill';

import AWS from 'aws-sdk';
import permutator from 'permutator';
import { resolve } from 'path';

const sns = new AWS.SNS();

const BATCH_SIZE = 10;
const dataProvider = 'cryptoCandlestick';
const traderProvider = 'simulatorTrader';

const snsPublish = (topicArn, message) => new Promise((resolve, reject) => {
    const params = {
        TopicArn: topicArn,
        Message: JSON.stringify(message),
    };

    sns.publish(params, (err, data) => {
        console.log('sns', err, data);
        if (err) { reject(err); return; }
        resolve(data);
    });
});

exports.handler = (event, context, callback) => {
    //const message = JSON.parse(event.body);
    console.log('event', event.body);
    const message = JSON.parse(event.body);

    if (!message.campaign) {
        message.campaign = `${new Date().getTime()}_campaign`;
    }

    const instructions = [];
    message.symbols.forEach(symbols => {
      message.dates.forEach(dates => {
    
        const schema = message.parameters; /*{
          "type" : "object",
          "schemas" : {
            "parameters": message.parameters
          }
        };*/
        
        const base = {
          "simulation": true,
          "campaign": message.campaign,
          "symbol": symbols[0],
        
          "bot": message.bot,
          "data": dataProvider,
          "trader": traderProvider,
          
          "from": dates[0],
          "to": dates[1],
        
          "period": message.period,
        };
    
        permutator.generate(schema, data => {
          const instruction = Object.assign
          (
            {}, 
            base, 
            { 
              parameters: Object.assign
              (
                {}, 
                data,
                { baseSymbol: symbols[1] }
              )
            }
          );
    
          console.log(JSON.stringify(instruction, null, 2));
          instructions.push(instruction);
        });
      });
    });

    try {
        const batches = [];
        const instructionCount = instructions.length;

        while (instructions.length) {
            const batch = instructions.splice(0,BATCH_SIZE);
            if (batch.length > 0) {
                batches.push(snsPublish(process.env.SNS_NOTIFICATION_ARN, batch));
            }
        }

        Promise.all(batches)
            .then(data => callback(null, { statusCode: 200, body: JSON.stringify({ campaign: message.campaign, instructions: instructionCount, batches: batches.length }) }))
            .catch(e => callback(null, { statusCode: 500, body: JSON.stringify(e) }));
    }
    catch (e) {
        callback(e);
    }

};