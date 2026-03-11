import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LiquidityPool } from '@/types/finance';
import { getUserFriendlyError } from '@/lib/errorHandler';

export const usePools = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pools = [], isLoading } = useQuery({
    queryKey: ['pools', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liquidity_pools')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        if (import.meta.env.DEV) console.error('Fetch pools error:', error);
        throw error;
      }
      
      return data.map(pool => ({
        ...pool,
        asset1Symbol: pool.asset1_symbol,
        asset2Symbol: pool.asset2_symbol,
        pairName: pool.pair_name,
        startDate: pool.start_date,
        endDate: pool.end_date,
        initialInvestment: Number(pool.initial_investment),
        feesGenerated: Number(pool.fees_generated),
        rangePercentage: Number(pool.range_percentage),
        asset1CurrentPrice: Number(pool.asset1_current_price),
        asset2CurrentPrice: Number(pool.asset2_current_price),
        asset1Quantity: Number(pool.asset1_quantity),
        asset2Quantity: Number(pool.asset2_quantity),
        createdAt: pool.created_at,
        updatedAt: pool.updated_at
      })) as LiquidityPool[];
    },
    enabled: !!user
  });

  const createPool = useMutation({
    mutationFn: async (pool: Omit<LiquidityPool, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('liquidity_pools')
        .insert([{
          user_id: user!.id,
          asset1_symbol: pool.asset1Symbol,
          asset2_symbol: pool.asset2Symbol,
          pair_name: pool.pairName,
          start_date: pool.startDate,
          end_date: pool.endDate,
          initial_investment: pool.initialInvestment,
          fees_generated: pool.feesGenerated,
          range_percentage: pool.rangePercentage,
          asset1_current_price: pool.asset1CurrentPrice,
          asset2_current_price: pool.asset2CurrentPrice,
          asset1_quantity: pool.asset1Quantity,
          asset2_quantity: pool.asset2Quantity,
          notes: pool.notes
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pools'] });
    }
  });

  const updatePool = useMutation({
    mutationFn: async (pool: LiquidityPool) => {
      const { error } = await supabase
        .from('liquidity_pools')
        .update({
          asset1_symbol: pool.asset1Symbol,
          asset2_symbol: pool.asset2Symbol,
          pair_name: pool.pairName,
          start_date: pool.startDate,
          end_date: pool.endDate,
          initial_investment: pool.initialInvestment,
          fees_generated: pool.feesGenerated,
          range_percentage: pool.rangePercentage,
          asset1_current_price: pool.asset1CurrentPrice,
          asset2_current_price: pool.asset2CurrentPrice,
          asset1_quantity: pool.asset1Quantity,
          asset2_quantity: pool.asset2Quantity,
          notes: pool.notes
        })
        .eq('id', pool.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pools'] });
    }
  });

  const deletePool = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('liquidity_pools')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pools'] });
    }
  });

  return {
    pools,
    isLoading,
    createPool,
    updatePool,
    deletePool
  };
};
