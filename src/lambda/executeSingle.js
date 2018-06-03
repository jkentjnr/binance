import 'babel-polyfill';

import AWS from 'aws-sdk';
import { exec } from 'child_process';
import { start } from 'repl';
const stepFunctions = new AWS.StepFunctions();
console.log('stepFunctions', stepFunctions);

const sleep = (duration) => {
    return new Promise(resolve => setTimeout(() => resolve(), duration));
};

const executeStep = (params) => new Promise((resolve, reject) => {
    stepFunctions.startExecution(params, (err, data) => {
        console.log(err, data);
        if (err) { reject(err); return; }
        console.log('data', data);
        resolve(data);
    });
});

const describeStep = (params) => new Promise((resolve, reject) => {
    stepFunctions.describeExecution(params, (err, data) => {
        console.log(err, data);
        if (err) { reject(err); return; }
        console.log('data', data);
        resolve(data);
    });
});

exports.handler = async (event, context, callback) => {
    const startTime = new Date().getTime();
    try {
        console.log(event);
        const data = JSON.parse(event.body);

        let params = {
            stateMachineArn: process.env.STEP_EXECUTE_SCALAR_ARN,
            input: JSON.stringify(data)
        };

        console.log(params);

        const resultExec = await executeStep(params);
        params = { executionArn: resultExec.executionArn };

        let resultDesc;
        let endTime = new Date().getTime();
        while ((endTime - startTime) < 25000) {

            resultDesc = await describeStep(params);
            console.log(resultDesc);

            if (resultDesc.status === 'SUCCEEDED') break;

            await sleep(800);

            endTime = new Date().getTime();
        }
        
        console.log('resultDesc', resultDesc);
        if (!resultDesc || resultDesc.status !== 'SUCCEEDED') {
            resultDesc = { status: 'RUNNING', executionArn: resultExec.executionArn };
        }

        callback(null, {
            statusCode: 200,
            body: (resultDesc.output) ? resultDesc.output : resultDesc
        });
    }
    catch (e) {
        console.log('e', e);
        callback(null, {
            statusCode: 500,
            body: JSON.stringify(e)
        });
    }
}