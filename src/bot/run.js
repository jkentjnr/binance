import { ArgumentParser } from 'argparse';
import BotEngine from './engine';

const description = 'Binance Bot Engine';

var parser = new ArgumentParser({ description, version: '0.0.1', addHelp:true });
parser.addArgument(['-s', '--symbol'], { help: 'The binance pair eg. ETHBTC. Defaults to config file symbols.', required: true });
parser.addArgument(['-b', '--bot'], { help: 'The bot you wish to use', defaultValue: 'gary', choices: ['gary'], dest: 'bot' });
parser.addArgument(['-f', '--simFrom'], { help: 'The start date to simulate from.' });
parser.addArgument(['-t', '--simTo'], { help: 'The end date to simulate to.' });
parser.addArgument(['-n', '--name'], { help: 'The name of the processor (for logging)' });
parser.addArgument(['-l', '--sleep'], { help: 'Number of seconds to sleep between bot executions', type:'int', defaultValue: 3 });
const args = parser.parseArgs();

(async () => {
	const engine = new BotEngine(args);
	await engine.execute();
})();