const ACTION_NONE = 'none';
const ACTION_SELL = 'sell';
const ACTION_BUY  = 'buy';

exports.getPeriodName = (period) => {
	switch (period) {
        case 3600:  return '1HRS';
        case 14400: return '4HRS';
        case 86400: return '1DAY';
        default:    return null;
    }
};

exports.getWallet = (message, symbol, action = ACTION_SELL) => {
    for (const key in message.wallet) {
        const wallet = message.wallet[key];
        if (action === ACTION_BUY && wallet.buy && wallet.buy.includes(symbol)) return wallet;
        if (action === ACTION_SELL && wallet.sell && wallet.sell.includes(symbol)) return wallet;
    }

    throw new Error(`Wallet not found for ${action} ${symbol}`);
};

exports.actions = {
    ACTION_NONE,
    ACTION_SELL,
    ACTION_BUY,
};