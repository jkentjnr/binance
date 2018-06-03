import Exceptions from '../exceptions';
import s3Helper from './s3Helper';
import set from 'lodash.set';

const S3_TICKET = 'S3_TICKET';
const S3_PATH = 'messages/';

exports.loadMessage = async (event) => {
	if (event.key && event.type === S3_TICKET) {
		let message;
		try { message = await s3Helper.getFile(event.key); }
		catch (e) { console.log('err1', e); throw new Exceptions.ConfigurationError('Could not load the configuration from S3.', e); }

		try { message = JSON.parse(message); }
		catch (e) { console.log('err2', e); throw new Exceptions.ValidationError('Could not parse the data as JSON.', e); }

		return message;
	}

	return event;
};

exports.saveMessage = async (context, message) => {
	if ((message && message.step && message.step.type === S3_TICKET) === false) {
		const key = `${S3_PATH}${context.invokeid}.json`;
		set(message, 'step.type', S3_TICKET);
		set(message, 'step.key', key);
	}

	try { await s3Helper.saveFile(message.step.key, message); }
	catch (e) { console.log('err4', e, JSON.stringify(message)); throw new Exceptions.ConfigurationError('Could not save the configuration to S3.', e); }

	return message.step;
};

exports.handleResult = async (context, callback, err, data) => {
	console.log('handleResult', err, data);
	const response = await exports.saveMessage(context, data);

	if (err)
		callback(err);
	else
		callback(null, response);
};

const writeToLog = (config, message, a, b, c, d, e, f, g, h, i) => {
	if (!message.console) message.console = [];
	const appName = (config.title && config.color) ? config.color(config.title) : ' App       ';
	console.log(appName, a, b, c, d, e, f, g, h, i);
	message.console.push([config.color(config.title), a||'', b||'', c||'', d||'', e||'', f||'', g||'', h||'' ,i||''].join(' '));
}

exports.dataWrapper = async (config, event, context, callback, func) => {
	context.callbackWaitsForEmptyEventLoop = config.waitForEmptyEventLoop || false;

	let message;
	const log = {
		application: { write: (a,b,c,d,e,f,g,h,i) => writeToLog(config, message, a,b,c,d,e,f,g,h,i) },
		system: { write: (a,b,c,d,e,f,g,h,i) => console.log('SYSTEM', a||'',b||'',c||'',d||'',e||'',f||'',g||'',h||'',i||'') }
	};	
	
	try {
		message = await exports.loadMessage(event);
		const funcResult = await func(message, log);

		if (config.sendResponse === true) {
			callback(null, funcResult);
		}
		else
			await exports.handleResult(context, callback, null, funcResult);
		
	}
	catch(e) {
		await exports.handleResult(context, callback, e, null);
	}
};
