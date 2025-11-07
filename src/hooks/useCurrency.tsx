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
      setExchangeRate: (rate) => {
        // Validate and sanitize
        let validRate = rate;
        
        if (isNaN(validRate) || !isFinite(validRate)) {
          validRate = 5.0; // Reset to default
        }
        
        if (validRate <= 0) {
          validRate = 0.01; // Minimum safe value
        }
        
        if (validRate > 10000) {
          validRate = 10000; // Maximum safe value
        }
        
        set({ exchangeRate: validRate });
      },
      convertValue: (value: number, fromCurrency: 'USD' | 'BRL' = 'USD') => {
        const { currency, exchangeRate } = get();
        
        // Safety check for division
        if (exchangeRate <= 0 || !isFinite(exchangeRate)) {
          if (import.meta.env.DEV) {
            console.warn('Invalid exchange rate detected, using default');
          }
          return value; // Return unconverted value as fallback
        }
        
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
