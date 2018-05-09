import 'babel-polyfill';
import BotEngine from './engine';

exports.executeHandler = function(event, context, callback) {
    const data = JSON.parse(event.body);
    console.log(data);

	const engine = new BotEngine(data);
    engine.execute()
        .then(result => callback(null, { statusCode: result.statusCode || 200, body: JSON.stringify(result) }))
        .catch(e => callback(null, { statusCode: 500, body: JSON.stringify(e) }));
 }