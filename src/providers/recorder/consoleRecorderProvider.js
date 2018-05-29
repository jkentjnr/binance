import moment from 'moment';
import colors from 'colors/safe';
import prettyjson from 'prettyjson';
import RecorderBase from './recorderBase';

class ConsoleRecorderProvider extends RecorderBase {

    constructor() {
        super();
    }

    async setHeader(message, log) {
		log.application.write();
		log.application.write(`${colors.bold('Binance Bot Engine')}`);
		log.application.write(`------------------`);
		log.application.write();
		log.application.write(`Symbol: ${colors.bold(message.symbol)}`);
		log.application.write(`Transaction Fee: ${colors.bold(message.config.txnFee)}`);
        log.application.write();
        
        log.application.write(`Live Mode: ${(message.simulation) ? `${colors.red('NOT ENABLED')} (Running Simulation)` : colors.green('ENABLED')}`);
        
		if (message.simulation) {
			log.application.write(`Simulation Start: ${moment(message.from).format('Do MMM YY h:mm:ss a')}`);
			log.application.write(`Simulation End:   ${moment(message.to).format('Do MMM YY h:mm:ss a')}`);
        }

        this.printOptions(message, log);
    }

    async setFooter(message, log) {
        log.application.write();
        log.application.write(colors.bold('TRADE HISTORY'));
        log.application.write(colors.bold('============='));
        log.application.write();
        if (message.simulation) {
            log.application.write(`Simulation Start: ${moment(message.execution.start).format('Do MMM YY h:mm:ss a')}`);
            log.application.write(`Simulation End:   ${moment(message.execution.end).format('Do MMM YY h:mm:ss a')}`);
        }
        log.application.write(`Transaction Fee:  ${message.config.txnFee}`);
        log.application.write();

        if (message.history.length === 0) {
            log.application.write('  (No Trades)');
        }
        else {
            message.history.forEach((item, i) => {
                log.application.write(`Trade #${i+1}`);
                log.application.write(`------------------------------------------------------------------------`);
                log.application.write(`${colors.bold('SYMBOL:                ')} ${item.symbol} (${moment(item.time).format('Do MMM YY h:mm:ss a')})`);
                log.application.write(`${colors.bold('ACTION:                ')} ${item.action.toUpperCase()}`);
                log.application.write(`Price:                  ${item.price.toFixed(10)}`);
                log.application.write(`Volume:                 ${item.volume.toFixed(10)}`);
                log.application.write(`Behaviour:              ${item.behaviour}`);
                log.application.write(`Value:                  ${item.value.toFixed(10)}`);
                log.application.write();	
            });
        }

        log.application.write();	
    }

    printOptions(message, log) {
		log.application.write();
		log.application.write(`Parameters`);
		log.application.write(`----------`);
		log.application.write();
		const result = prettyjson.render(message).split('\n');
		result.forEach(line => log.application.write(line));
        log.application.write();
    }
}

const provider = new ConsoleRecorderProvider();
export default provider;