import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/types/finance';

export const useCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*, accounts(name)')
        .order('created_at', { ascending: false });
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error('Fetch cards error:', error);
        }
        throw error;
      }
      
      return data.map(card => ({
        id: card.id,
        accountId: card.account_id,
        name: card.name,
        creditLimit: Number(card.credit_limit),
        usedLimit: Number(card.used_limit),
        createdAt: card.created_at,
        updatedAt: card.updated_at,
        accountName: card.accounts?.name
      }));
    },
    enabled: !!user
  });

  const createCard = useMutation({
    mutationFn: async (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'usedLimit'>) => {
      const { data, error } = await supabase
        .from('cards')
        .insert([{
          user_id: user!.id,
          account_id: card.accountId,
          name: card.name,
          credit_limit: card.creditLimit,
          used_limit: 0
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    }
  });

  const updateCard = useMutation({
    mutationFn: async (card: Card) => {
      const { error } = await supabase
        .from('cards')
        .update({
          name: card.name,
          account_id: card.accountId,
          credit_limit: card.creditLimit,
          used_limit: card.usedLimit
        })
        .eq('id', card.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    }
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    }
  });

  return {
    cards,
    isLoading,
    createCard,
    updateCard,
    deleteCard
  };
};
