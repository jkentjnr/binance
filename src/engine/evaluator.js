import algorithmFactory from '../algorithms';
import providerFactory from '../providers';
import moment from 'moment';

class Evaluator {

	constructor() {
		this.processCounter = 0;
	}

	setDefaults(message) {
		if (!message.state) { 
			message.state = {};
		}

		if (!message.state.evaluate) {
			message.state.evaluate = {
				botIterator: 0
			};
		}
	}

    async evaluate(message, log) {
        const dataProvider = await providerFactory.getDataProvider(message, log);
        const bots = algorithmFactory.getBotProcessor(message.bot);

        // Initialise the bots.
        for (let i = 0; i < bots.length; i++) {
            const botProcessor = bots[i];    
			await botProcessor.initialise(message, log, dataProvider);
		}

		this.setDefaults(message);

		// Set the start time to the simulated start time.
		if (!message.state.time)
        	message.state.time = new Date(message.from);

		// ---------------------------------------------

		while (message.state.time < message.to) {
			while (message.state.evaluate.botIterator < bots.length) {

				const botProcessor = bots[message.state.evaluate.botIterator];
				log.application.write(`Executing bot: ${botProcessor.getName()}`);

				await botProcessor.evaluate(message, log);

				let hasInstruction = false;
				if (message.state.orders && message.state.orders.length > 0) {
					hasInstruction = await botProcessor.execute(message, this.executeInstruction.bind(this));
				}
				
				await this.evalSleep();
				message.state.evaluate.botIterator++;
			}

			// Simulate sleep.
			if (message.simulation === true) {
				message.state.time.setSeconds(message.state.time.getSeconds() + message.period);
				log.application.write(`Simulate sleep for ${message.period} second(s). New Date/Time: ${moment(message.state.time).format('Do MMM YY h:mm:ss a')}`);
			}

			message.state.evaluate.botIterator = 0;

			if (message.simulation !== true)
			break;
		}
		

    }

    async executeInstruction(order, message) {
		console.log('order', order);
	}
	
	async evalSleep() {
		if (this.processCounter > 60) {
			await this.sleep(20);
			this.processCounter = 0;
		}
		else
			this.processCounter++;
	}

	sleep(duration) {
		return new Promise(resolve => setTimeout(() => resolve(), duration));
	}
}

export default new Evaluator();