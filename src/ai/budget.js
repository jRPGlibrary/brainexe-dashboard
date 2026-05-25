const shared = require('../shared');
const { pushLog } = require('../logger');

const PRICE_IN  = { 'claude-sonnet-4-6': 3.00, 'claude-haiku-4-5-20251001': 0.80 };
const PRICE_OUT = { 'claude-sonnet-4-6': 15.00, 'claude-haiku-4-5-20251001': 4.00 };

const BUDGET_PROFILES = {
  normal: { model: 'claude-sonnet-4-6',         ctxLimit: 15, maxTokensMult: 1.0 },
  orange: { model: 'claude-sonnet-4-6',         ctxLimit: 5,  maxTokensMult: 0.7 },
  red:    { model: 'claude-haiku-4-5-20251001', ctxLimit: 3,  maxTokensMult: 0.6 },
};

function _getParisDay() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function _resetIfNeeded() {
  if (typeof shared.dailyCostUSD !== 'number') shared.dailyCostUSD = 0;
  if (typeof shared.dailyCostResetDay !== 'string') shared.dailyCostResetDay = '';
  const today = _getParisDay();
  if (shared.dailyCostResetDay !== today) {
    shared.dailyCostUSD = 0;
    shared.dailyCostResetDay = today;
  }
}

function getBudgetMode() {
  _resetIfNeeded();
  if (shared.dailyCostUSD >= 2.00) return 'red';
  if (shared.dailyCostUSD >= 1.50) return 'orange';
  return 'normal';
}

function getBudgetProfile() {
  return BUDGET_PROFILES[getBudgetMode()];
}

function trackCost(inputTokens, outputTokens, model) {
  _resetIfNeeded();
  const inPrice  = PRICE_IN[model]  ?? PRICE_IN['claude-sonnet-4-6'];
  const outPrice = PRICE_OUT[model] ?? PRICE_OUT['claude-sonnet-4-6'];
  const prevMode = getBudgetMode();
  shared.dailyCostUSD += ((inputTokens * inPrice) + (outputTokens * outPrice)) / 1_000_000;
  const newMode = getBudgetMode();
  if (prevMode !== newMode) {
    pushLog('SYS', `💰 Budget ${newMode.toUpperCase()} — $${shared.dailyCostUSD.toFixed(3)}/jour`, newMode === 'red' ? 'error' : 'warn');
  }
}

module.exports = { trackCost, getBudgetMode, getBudgetProfile };
