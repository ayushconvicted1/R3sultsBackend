const fetch = require('node-fetch');

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

const fallbackRates = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.12, CAD: 1.36, AUD: 1.53,
  JPY: 149.50, CNY: 7.24, MXN: 17.15, BRL: 4.97,
};

const currencySymbols = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'C$', AUD: 'A$',
  JPY: '¥', CNY: '¥', MXN: 'MX$', BRL: 'R$', AED: 'د.إ', SAR: '﷼',
  SGD: 'S$', HKD: 'HK$', CHF: 'CHF', NZD: 'NZ$',
};

const currencyNames = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', INR: 'Indian Rupee',
  CAD: 'Canadian Dollar', AUD: 'Australian Dollar', JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan', MXN: 'Mexican Peso', BRL: 'Brazilian Real',
  AED: 'UAE Dirham', SAR: 'Saudi Riyal', SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar', CHF: 'Swiss Franc', NZD: 'New Zealand Dollar',
};

// In-memory cache (1 hour)
let cachedRates = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 3600000;

async function fetchExchangeRates() {
  const now = Date.now();
  if (cachedRates && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedRates;
  }
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    if (!response.ok) throw new Error('Failed to fetch exchange rates');
    const data = await response.json();
    cachedRates = data.rates || {};
    cachedRates['USD'] = 1;
    cacheTimestamp = now;
    return cachedRates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    cachedRates = fallbackRates;
    cacheTimestamp = now;
    return fallbackRates;
  }
}

exports.getCurrency = async (req, res, next) => {
  try {
    const from = req.query.from || 'USD';
    const to = req.query.to;
    const amount = parseFloat(req.query.amount || '1');
    const type = req.query.type || 'convert';

    const exchangeRates = await fetchExchangeRates();

    // List currencies
    if (type === 'list') {
      const currencies = Object.keys(exchangeRates)
        .filter(code => currencyNames[code])
        .map(code => ({ code, name: currencyNames[code], symbol: currencySymbols[code] || code, rate: exchangeRates[code] }))
        .sort((a, b) => a.code.localeCompare(b.code));
      return res.json({ success: true, data: currencies, source: 'api', timestamp: new Date().toISOString() });
    }

    // All rates
    if (type === 'rates') {
      const rates = Object.keys(exchangeRates)
        .filter(code => currencyNames[code])
        .map(code => ({
          code, name: currencyNames[code], symbol: currencySymbols[code] || code,
          rate: exchangeRates[code],
          rateFromBase: from === 'USD' ? exchangeRates[code] : (exchangeRates[code] / (exchangeRates[from] || 1)).toFixed(4),
        }));
      return res.json({ success: true, base: from, data: rates, source: 'api', timestamp: new Date().toISOString() });
    }

    // Convert
    if (to && type === 'convert') {
      if (!exchangeRates[from] || !exchangeRates[to]) {
        return res.status(400).json({ success: false, error: 'Invalid currency code' });
      }
      const fromRate = exchangeRates[from];
      const toRate = exchangeRates[to];
      const convertedAmount = (amount / fromRate) * toRate;
      return res.json({
        success: true, data: {
          from: { code: from, symbol: currencySymbols[from] || from, name: currencyNames[from] || from, amount },
          to: { code: to, symbol: currencySymbols[to] || to, name: currencyNames[to] || to, amount: parseFloat(convertedAmount.toFixed(2)) },
          rate: parseFloat((toRate / fromRate).toFixed(6)),
          timestamp: new Date().toISOString(), source: 'api',
        },
      });
    }

    // Single currency info
    if (!exchangeRates[from]) {
      return res.status(400).json({ success: false, error: 'Invalid currency code' });
    }
    return res.json({
      success: true,
      data: { code: from, name: currencyNames[from] || from, symbol: currencySymbols[from] || from, rate: exchangeRates[from] },
      source: 'api', timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Currency API error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process currency request' });
  }
};
