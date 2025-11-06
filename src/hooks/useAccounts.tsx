import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Account } from '@/types/finance';
import { getUserFriendlyError } from '@/lib/errorHandler';

export const useAccounts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Fetch accounts error:', error);
        throw error;
      }
      
      return data.map(account => ({
        ...account,
        balance: Number(account.balance),
        createdAt: account.created_at,
        updatedAt: account.updated_at
      })) as Account[];
    },
    enabled: !!user
  });

  const createAccount = useMutation({
    mutationFn: async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('accounts')
        .insert([{
          user_id: user!.id,
          name: account.name,
          type: account.type,
          balance: account.balance,
          currency: account.currency,
          notes: account.notes
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const updateAccount = useMutation({
    mutationFn: async (account: Account) => {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: account.name,
          type: account.type,
          balance: account.balance,
          currency: account.currency,
          notes: account.notes
        })
        .eq('id', account.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  return {
    accounts,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount
  };
};
