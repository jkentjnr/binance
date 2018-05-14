import Exceptions from '../exceptions';

exports.loadMessage = (event) => {
	try { 
		return event;
	}
	catch(e) { 
		throw new Exceptions.ValidationError('Could not parse the data as JSON.', e); 
	}
};

exports.dataWrapper = (config, event, context, callback, func) => {
	const handleResult = (err, data) => {
		//if (err) { console.log('EXCEPTION', JSON.stringify(err, null, 2)); }
		//if (data) { console.log('RESULT', JSON.stringify(data, null, 2)); }
		if (err)
			callback(err);
		else
			callback(null, data);
    };
    
    const log = {
        application: { write: () => console.log(config.color(config.title), ' ', ...arguments) },
        system: { write: () => console.log(config.title.toUpperCase(), ...arguments) }
    }

	try {
		const data = exports.loadMessage(event);

		const funcResult = func(data, log);

		if (funcResult.then) {
			funcResult
				.then(result => handleResult(null, result))
				.catch(e => handleResult(e, null));
		}
		else {

			handleResult(null, funcResult);
		}
	}
	catch(e) {
		handleResult(e, null);
	}
};