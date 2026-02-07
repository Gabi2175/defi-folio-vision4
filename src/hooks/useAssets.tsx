import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Asset } from '@/types/finance';
import { getUserFriendlyError } from '@/lib/errorHandler';

export const useAssets = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        if (import.meta.env.DEV) console.error('Fetch assets error:', error);
        throw error;
      }
      
      return data.map(asset => ({
        ...asset,
        averagePrice: Number(asset.average_price),
        currentPrice: Number(asset.current_price),
        quantity: Number(asset.quantity),
        createdAt: asset.created_at,
        updatedAt: asset.updated_at
      })) as Asset[];
    },
    enabled: !!user
  });

  const createAsset = useMutation({
    mutationFn: async (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('assets')
        .insert([{
          user_id: user!.id,
          name: asset.name,
          symbol: asset.symbol,
          type: asset.type,
          average_price: asset.averagePrice,
          current_price: asset.currentPrice,
          quantity: asset.quantity,
          notes: asset.notes
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    }
  });

  const updateAsset = useMutation({
    mutationFn: async (asset: Asset) => {
      const { error } = await supabase
        .from('assets')
        .update({
          name: asset.name,
          symbol: asset.symbol,
          type: asset.type,
          average_price: asset.averagePrice,
          current_price: asset.currentPrice,
          quantity: asset.quantity,
          notes: asset.notes
        })
        .eq('id', asset.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    }
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    }
  });

  return {
    assets,
    isLoading,
    createAsset,
    updateAsset,
    deleteAsset
  };
};
