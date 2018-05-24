import providerFactory from '../providers';

class Trader {

    async execute(message, log) {
		const traderProvider = await providerFactory.getTraderProvider(message, log);

        // Otherwise, execute orders inline.
        await traderProvider.execute(message, log);
		
    }

}

export default new Trader();