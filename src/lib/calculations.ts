import { LiquidityPool, PoolPNL } from '@/types/finance';

export const calculatePoolPNL = (pool: LiquidityPool): PoolPNL => {
  const asset1Value = pool.asset1Quantity * pool.asset1CurrentPrice;
  const asset2Value = pool.asset2Quantity * pool.asset2CurrentPrice;
  const totalValue = asset1Value + asset2Value + pool.feesGenerated;
  const totalInvested = pool.initialInvestment;
  const profitLoss = totalValue - totalInvested;
  const profitLossPercentage = (profitLoss / totalInvested) * 100;

  return {
    totalValue,
    profitLoss,
    profitLossPercentage,
    totalInvested,
    totalFees: pool.feesGenerated,
  };
};

export const formatCurrency = (value: number, currency: string = 'USD', fromCurrency: 'USD' | 'BRL' = 'USD'): string => {
  // This function is deprecated in favor of useCurrency.formatCurrency
  // Kept for backwards compatibility
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('pt-BR');
};
