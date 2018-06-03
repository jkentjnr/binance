import 'babel-polyfill';
import AWS from 'aws-sdk';

const stepFunctions = new AWS.StepFunctions();

const executeStep = (params) => new Promise((resolve, reject) => {
    stepFunctions.startExecution(params, (err, data) => {
        console.log(err, data);
        if (err) { reject(err); return; }
        console.log('data', data);
        resolve(data);
    });
});

exports.handler = (event, context, callback) => {
    let message = {};
    const jobs = [];
    
    event.Records.forEach(record => {
        const snsMessage = JSON.parse(record.Sns.Message);
        snsMessage.forEach(item => {
            message = item;

            const params = {
                stateMachineArn: process.env.STEP_EXECUTE_SCALAR_ARN,
                input: JSON.stringify(item)
            };
    
            jobs.push(executeStep(params));
        });
    });

    Promise.all(jobs)
        .then(data => callback(null, { statusCode: 200, body: JSON.stringify({ campaign: message.campaign, count: jobs.length }) }))
        .catch(e => callback(null, { statusCode: 500, body: JSON.stringify(e) }));
};