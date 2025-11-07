import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CurrencyStore {
  currency: 'USD' | 'BRL';
  exchangeRate: number; // BRL per USD
  setCurrency: (currency: 'USD' | 'BRL') => void;
  setExchangeRate: (rate: number) => void;
  convertValue: (value: number, fromCurrency: 'USD' | 'BRL') => number;
  formatCurrency: (value: number, fromCurrency?: 'USD' | 'BRL') => string;
}

export const useCurrency = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      exchangeRate: 5.0, // Default: 1 USD = 5 BRL
      setCurrency: (currency) => set({ currency }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
      convertValue: (value: number, fromCurrency: 'USD' | 'BRL' = 'USD') => {
        const { currency, exchangeRate } = get();
        
        // If displaying in the same currency as stored, no conversion needed
        if (fromCurrency === currency) {
          return value;
        }
        
        // Convert from USD to BRL
        if (fromCurrency === 'USD' && currency === 'BRL') {
          return value * exchangeRate;
        }
        
        // Convert from BRL to USD
        if (fromCurrency === 'BRL' && currency === 'USD') {
          return value / exchangeRate;
        }
        
        return value;
      },
      formatCurrency: (value: number, fromCurrency: 'USD' | 'BRL' = 'USD') => {
        const { currency, convertValue } = get();
        const convertedValue = convertValue(value, fromCurrency);
        
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: currency
        }).format(convertedValue);
      }
    }),
    {
      name: 'currency-storage'
    }
  )
);
