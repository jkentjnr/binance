import algorithmFactory from '../algorithms';
import providerFactory from '../providers';
import moment from 'moment';

class Evaluator {

	constructor() {
		this.processCounter = 0;
	}

	setDefaults(message) {
		message.to = new Date(message.to);
		message.from = new Date(message.from);

		if (!message.state) { 
			message.state = {};
		}

		if (!message.state.evaluate) {
			message.state.evaluate = {
				botIterator: 0
			};
		}

		// Set the start time to the simulated start time.
		if (!message.state.time)
			message.state.time = new Date(message.from);
		else 
			message.state.time = new Date(message.state.time);
	}

    async evaluate(message, log) {
		const dataProvider = await providerFactory.getDataProvider(message, log);
		const traderProvider = await providerFactory.getTraderProvider(message, log);
        const bots = await algorithmFactory.getBotProcessorAndInitialise(message, log, dataProvider);

		this.setDefaults(message);

		// ---------------------------------------------
		console.log(message.state.time, message.to, message.state.time < message.to);

		while (message.state.time < message.to) {
			console.log(message.state.time, message.to, message.state.time < message.to);
			while (message.state.evaluate.botIterator < bots.length) {
				console.log(34567);

				const botProcessor = bots[message.state.evaluate.botIterator++];
				log.application.write(`Executing bot: ${botProcessor.getName()}`);

				await botProcessor.evaluate(message, log);
console.log('evaluate');
				if (message.orders && message.orders.length > 0) {
					const res = await traderProvider.dispatch(message, log);

					// If true, then dispatch the orders to be fullfilled.
					if (res === true) {
						return {
							dispatch: true,
							message
						};
					}

					// Otherwise, execute orders inline.
					await traderProvider.execute(message, log);
				}
				console.log('evalSleep', 1);
				await this.evalSleep();
				console.log('evalSleep', 1);
				// message.state.evaluate.botIterator++;
			}

			// Simulate sleep.
			if (message.simulation === true) {
				this.addTime(message);
				log.application.write(`Simulate sleep for ${message.period} second(s). New Date/Time: ${moment(message.state.time).format('Do MMM YY h:mm:ss a')}`);
			}

			message.state.evaluate.botIterator = 0;

			if (message.simulation !== true)
				break;
		}

		console.log(888);

		while (message.state.evaluate.botIterator < bots.length) {

			const botProcessor = bots[message.state.evaluate.botIterator];
			log.application.write(`Executing bot: ${botProcessor.getName()}`);

			await botProcessor.finalise(message, log);

			if (message.orders && message.orders.length > 0) {
				const res = await traderProvider.dispatch(message, log);

				// If true, then dispatch the orders to be fullfilled.
				if (res === true) {
					return {
						dispatch: true,
						message
					};
				}

				// Otherwise, execute orders inline.
				await traderProvider.execute(message, log);
			}
			
			await this.evalSleep();
			message.state.evaluate.botIterator++;
		}

		message.execution.end = new Date();

		return {
			dispatch: false,
			message
		};
		
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

	addTime(message) {
		const originalOffset = message.state.time.getTimezoneOffset();
		message.state.time.setSeconds(message.state.time.getSeconds() + message.period);
		const newOffset = message.state.time.getTimezoneOffset();

		// Handle changes in Daylight Savings.
		if (originalOffset !== newOffset) {
			const offset = originalOffset - newOffset;

			message.state.time = moment(message.state.time).add(offset, 'm').toDate();
		}
	}
}

export default new Evaluator();