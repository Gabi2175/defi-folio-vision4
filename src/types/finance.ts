export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: 'crypto' | 'stock' | 'other';
  averagePrice: number;
  currentPrice: number;
  quantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiquidityPool {
  id: string;
  asset1Symbol: string;
  asset2Symbol: string;
  pairName: string;
  startDate: string;
  endDate?: string;
  initialInvestment: number;
  feesGenerated: number;
  rangePercentage: number;
  asset1CurrentPrice: number;
  asset2CurrentPrice: number;
  asset1Quantity: number;
  asset2Quantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'investment' | 'crypto' | 'other';
  balance: number;
  currency: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  description: string;
  date: string;
  toAccountId?: string;
  createdAt: string;
}

export interface PoolPNL {
  totalValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  totalInvested: number;
  totalFees: number;
}

export interface Card {
  id: string;
  accountId: string;
  name: string;
  creditLimit: number;
  usedLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface CardTransaction {
  id: string;
  cardId: string;
  description: string;
  totalAmount: number;
  installments: number;
  paidInstallments: number;
  installmentValue: number;
  transactionDate: string;
  createdAt: string;
}
