import { Asset, LiquidityPool, Account, Transaction } from '@/types/finance';

const STORAGE_KEYS = {
  ASSETS: 'finance_assets',
  POOLS: 'finance_pools',
  ACCOUNTS: 'finance_accounts',
  TRANSACTIONS: 'finance_transactions',
};

// Assets
export const getAssets = (): Asset[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ASSETS);
  return data ? JSON.parse(data) : [];
};

export const saveAssets = (assets: Asset[]) => {
  localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
};

export const addAsset = (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Asset => {
  const assets = getAssets();
  const newAsset: Asset = {
    ...asset,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveAssets([...assets, newAsset]);
  return newAsset;
};

export const updateAsset = (id: string, updates: Partial<Asset>): Asset | null => {
  const assets = getAssets();
  const index = assets.findIndex(a => a.id === id);
  if (index === -1) return null;
  
  assets[index] = { ...assets[index], ...updates, updatedAt: new Date().toISOString() };
  saveAssets(assets);
  return assets[index];
};

export const deleteAsset = (id: string): boolean => {
  const assets = getAssets();
  const filtered = assets.filter(a => a.id !== id);
  saveAssets(filtered);
  return filtered.length < assets.length;
};

// Liquidity Pools
export const getPools = (): LiquidityPool[] => {
  const data = localStorage.getItem(STORAGE_KEYS.POOLS);
  return data ? JSON.parse(data) : [];
};

export const savePools = (pools: LiquidityPool[]) => {
  localStorage.setItem(STORAGE_KEYS.POOLS, JSON.stringify(pools));
};

export const addPool = (pool: Omit<LiquidityPool, 'id' | 'createdAt' | 'updatedAt'>): LiquidityPool => {
  const pools = getPools();
  const newPool: LiquidityPool = {
    ...pool,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  savePools([...pools, newPool]);
  return newPool;
};

export const updatePool = (id: string, updates: Partial<LiquidityPool>): LiquidityPool | null => {
  const pools = getPools();
  const index = pools.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  pools[index] = { ...pools[index], ...updates, updatedAt: new Date().toISOString() };
  savePools(pools);
  return pools[index];
};

export const deletePool = (id: string): boolean => {
  const pools = getPools();
  const filtered = pools.filter(p => p.id !== id);
  savePools(filtered);
  return filtered.length < pools.length;
};

// Accounts
export const getAccounts = (): Account[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  return data ? JSON.parse(data) : [];
};

export const saveAccounts = (accounts: Account[]) => {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
};

export const addAccount = (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Account => {
  const accounts = getAccounts();
  const newAccount: Account = {
    ...account,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveAccounts([...accounts, newAccount]);
  return newAccount;
};

export const updateAccount = (id: string, updates: Partial<Account>): Account | null => {
  const accounts = getAccounts();
  const index = accounts.findIndex(a => a.id === id);
  if (index === -1) return null;
  
  accounts[index] = { ...accounts[index], ...updates, updatedAt: new Date().toISOString() };
  saveAccounts(accounts);
  return accounts[index];
};

export const deleteAccount = (id: string): boolean => {
  const accounts = getAccounts();
  const filtered = accounts.filter(a => a.id !== id);
  saveAccounts(filtered);
  return filtered.length < accounts.length;
};

// Transactions
export const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return data ? JSON.parse(data) : [];
};

export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

export const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt'>): Transaction => {
  const transactions = getTransactions();
  const newTransaction: Transaction = {
    ...transaction,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  
  // Update account balances
  const accounts = getAccounts();
  const accountIndex = accounts.findIndex(a => a.id === transaction.accountId);
  
  if (accountIndex !== -1) {
    if (transaction.type === 'income') {
      accounts[accountIndex].balance += transaction.amount;
    } else if (transaction.type === 'expense') {
      accounts[accountIndex].balance -= transaction.amount;
    } else if (transaction.type === 'transfer' && transaction.toAccountId) {
      accounts[accountIndex].balance -= transaction.amount;
      const toAccountIndex = accounts.findIndex(a => a.id === transaction.toAccountId);
      if (toAccountIndex !== -1) {
        accounts[toAccountIndex].balance += transaction.amount;
      }
    }
    saveAccounts(accounts);
  }
  
  saveTransactions([...transactions, newTransaction]);
  return newTransaction;
};

export const deleteTransaction = (id: string): boolean => {
  const transactions = getTransactions();
  const filtered = transactions.filter(t => t.id !== id);
  saveTransactions(filtered);
  return filtered.length < transactions.length;
};
