exports.getPeriodName = (period) => {
	switch (period) {
        case 3600:  return '1HRS';
        case 14400: return '4HRS';
        case 86400: return '1DAY';
        default:    return null;
    }
};