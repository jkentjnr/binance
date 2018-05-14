import AWS from 'aws-sdk';
import lambdaHelper from '../utils/lambdaHelper';

const stepFunctions = new AWS.StepFunctions();

exports.handler = function(event, context, callback) {
    lambdaHelper.dataWrapper(config, event, context, callback, (message, log) => {
        log.application.write('MESSAGE', JSON.stringify(message, null, 2));

        getStepStatus(message.executionArn)
            .then(result => callback(null, { statusCode: 200, body: JSON.stringify(result) }))
            .then(e => callback(null, { statusCode: 500, body: e.message }));
    });
}

const getStepStatus = (executionArn) => {
	const params = { executionArn };

	return new Promise((resolve, reject) => {
		stepFunctions.describeExecution(params, function(err, data) {
			if (err) { 
				console.log('STATUS', 'ERROR', 'STEP', JSON.stringify(err, null, 2));
				reject(err); 
				return; 
			}
			resolve(data);
		});
	});
};