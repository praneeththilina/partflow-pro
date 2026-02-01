import { db } from '../services/db';

export const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
    
    // Get symbol from DB (synchronous from cache)
    const settings = db.getSettings();
    const symbol = settings.currency_symbol || 'Rs.';

    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
