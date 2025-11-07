import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  date: string;
  account_id: string | null;
  category_id: string | null;
  to_account_id: string | null;
  created_at: string;
  accounts?: { name: string } | null;
  categories?: { name: string; color: string } | null;
}

export const useTransactions = () => {
  const { user } = useAuth();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts!transactions_account_id_fkey(name),
          categories(name, color)
        `)
        .order('date', { ascending: false });
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error('Fetch transactions error:', error);
        }
        throw error;
      }
      
      return data as Transaction[];
    },
    enabled: !!user
  });

  return {
    transactions,
    isLoading
  };
};
