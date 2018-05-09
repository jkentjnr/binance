import 'babel-polyfill';
import engine from './bot/engine';

exports.executeHandler = function(event, context, callback) {
    console.log('ENGINE');
    console.log(event);
    console.log(context);

    callback(null, "some success message");
    // or 
    // callback("some error type"); 
 }