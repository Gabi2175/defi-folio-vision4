import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LiquidityPool } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';
import { usePools } from '@/hooks/usePools';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { calculatePoolPNL } from '@/lib/calculations';
import { useQueryClient } from '@tanstack/react-query';

interface ClosePoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pools: LiquidityPool[];
}

export const ClosePoolDialog = ({ open, onOpenChange, pools }: ClosePoolDialogProps) => {
  const { toast } = useToast();
  const { deletePool } = usePools();
  const { accounts } = useAccounts();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const resetForm = () => {
    setSelectedPoolId('');
    setSelectedAccountId('');
  };

  const handleClosePool = async () => {
    if (!selectedPoolId) {
      toast({
        title: 'Erro',
        description: 'Selecione uma pool para fechar.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedAccountId) {
      toast({
        title: 'Erro',
        description: 'Selecione uma conta para receber o valor.',
        variant: 'destructive',
      });
      return;
    }

    const selectedPool = pools.find(p => p.id === selectedPoolId);
    if (!selectedPool) return;

    setIsProcessing(true);

    try {
      // Calculate total pool value (in USD, as pool prices are in USD)
      const pnl = calculatePoolPNL(selectedPool);
      const totalValueUSD = pnl.totalValue;

      // Get the destination account to check its currency
      const selectedAccount = accounts.find(a => a.id === selectedAccountId);
      const accountCurrency = selectedAccount?.currency || 'USD';
      
      // Convert value if account is BRL
      let finalValue = totalValueUSD;
      const { exchangeRate } = useCurrency.getState();
      
      if (accountCurrency === 'BRL') {
        finalValue = totalValueUSD * exchangeRate;
      }

      // Add value to selected account
      const { error: accountError } = await supabase.rpc('update_account_balance', {
        p_account_id: selectedAccountId,
        p_amount: finalValue,
        p_transaction_type: 'income'
      });

      if (accountError) {
        throw accountError;
      }

      // Delete the pool
      deletePool.mutate(selectedPoolId, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
          toast({
            title: 'Pool fechada',
            description: `Pool fechada com sucesso. ${formatCurrency(finalValue, accountCurrency as 'USD' | 'BRL')} depositado na conta.`,
          });
          onOpenChange(false);
          resetForm();
        },
        onError: (error) => {
          toast({
            title: 'Erro',
            description: 'Erro ao excluir a pool.',
            variant: 'destructive',
          });
        },
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao processar o fechamento da pool.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPool = pools.find(p => p.id === selectedPoolId);
  const poolValue = selectedPool ? calculatePoolPNL(selectedPool).totalValue : 0;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fechar Pool de Liquidez</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="poolId">Pool a Fechar</Label>
            <Select
              value={selectedPoolId}
              onValueChange={setSelectedPoolId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma pool" />
              </SelectTrigger>
              <SelectContent>
                {pools.map((pool) => (
                  <SelectItem key={pool.id} value={pool.id}>
                    {pool.pairName} - {formatCurrency(calculatePoolPNL(pool).totalValue)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountId">Conta de Destino</Label>
            <Select
              value={selectedAccountId}
              onValueChange={setSelectedAccountId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.filter(a => a.isActive).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPool && (
            <div className="rounded-lg bg-muted p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Valor a ser depositado:</p>
              <p className="text-2xl font-bold">{formatCurrency(poolValue)}</p>
            </div>
          )}

          <Button 
            onClick={handleClosePool} 
            className="w-full"
            disabled={isProcessing || !selectedPoolId || !selectedAccountId}
          >
            {isProcessing ? 'Processando...' : 'Fechar Pool'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
