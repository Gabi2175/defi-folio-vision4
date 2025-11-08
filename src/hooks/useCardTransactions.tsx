import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CardTransaction } from '@/types/finance';

export const useCardTransactions = (cardId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['card_transactions', user?.id, cardId],
    queryFn: async () => {
      let query = supabase
        .from('card_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });
      
      if (cardId) {
        query = query.eq('card_id', cardId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error('Fetch card transactions error:', error);
        }
        throw error;
      }
      
      return data.map(transaction => ({
        id: transaction.id,
        cardId: transaction.card_id,
        description: transaction.description,
        totalAmount: Number(transaction.total_amount),
        installments: transaction.installments,
        paidInstallments: transaction.paid_installments,
        installmentValue: Number(transaction.installment_value),
        transactionDate: transaction.transaction_date,
        createdAt: transaction.created_at
      })) as CardTransaction[];
    },
    enabled: !!user
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: Omit<CardTransaction, 'id' | 'createdAt' | 'paidInstallments' | 'installmentValue'>) => {
      const installmentValue = transaction.totalAmount / transaction.installments;
      
      const { data, error } = await supabase
        .from('card_transactions')
        .insert([{
          user_id: user!.id,
          card_id: transaction.cardId,
          description: transaction.description,
          total_amount: transaction.totalAmount,
          installments: transaction.installments,
          paid_installments: 0,
          installment_value: installmentValue,
          transaction_date: transaction.transactionDate
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Update card used limit
      const { error: updateError } = await supabase.rpc('update_card_limit', {
        p_card_id: transaction.cardId,
        p_amount: transaction.totalAmount,
        p_operation: 'add'
      });
      
      if (updateError) throw updateError;
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    }
  });

  const updateTransaction = useMutation({
    mutationFn: async (transaction: CardTransaction) => {
      const { error } = await supabase
        .from('card_transactions')
        .update({
          paid_installments: transaction.paidInstallments
        })
        .eq('id', transaction.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    }
  });

  const deleteTransaction = useMutation({
    mutationFn: async ({ id, cardId, totalAmount }: { id: string; cardId: string; totalAmount: number }) => {
      const { error } = await supabase
        .from('card_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update card used limit
      const { error: updateError } = await supabase.rpc('update_card_limit', {
        p_card_id: cardId,
        p_amount: totalAmount,
        p_operation: 'subtract'
      });
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    }
  });

  return {
    transactions,
    isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction
  };
};
