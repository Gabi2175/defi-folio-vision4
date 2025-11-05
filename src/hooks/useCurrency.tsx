import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CurrencyStore {
  currency: 'USD' | 'BRL';
  setCurrency: (currency: 'USD' | 'BRL') => void;
  formatCurrency: (value: number) => string;
}

export const useCurrency = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      setCurrency: (currency) => set({ currency }),
      formatCurrency: (value: number) => {
        const { currency } = get();
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: currency
        }).format(value);
      }
    }),
    {
      name: 'currency-storage'
    }
  )
);
