import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCards } from '@/hooks/useCards';
import { useCardTransactions } from '@/hooks/useCardTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/types/finance';
import { useQueryClient } from '@tanstack/react-query';

interface PayInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Card | null;
}

export function PayInvoiceDialog({ open, onOpenChange, card }: PayInvoiceDialogProps) {
  const { toast } = useToast();
  const { updateCard } = useCards();
  const { transactions } = useCardTransactions(card?.id);
  const { accounts } = useAccounts();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [installmentsToPay, setInstallmentsToPay] = useState('1');

  useEffect(() => {
    if (!open) {
      setInstallmentsToPay('1');
    }
  }, [open]);

  if (!card) return null;

  const linkedAccount = accounts.find(a => a.id === card.accountId);
  const unpaidTransactions = transactions.filter(t => t.paidInstallments < t.installments);
  const totalUnpaidInstallments = unpaidTransactions.reduce(
    (sum, t) => sum + (t.installments - t.paidInstallments),
    0
  );

  const handlePayInvoice = async () => {
    if (!linkedAccount) {
      toast({
        title: 'Erro',
        description: 'Conta vinculada não encontrada',
        variant: 'destructive'
      });
      return;
    }

    const numInstallments = parseInt(installmentsToPay);
    if (isNaN(numInstallments) || numInstallments < 1) {
      toast({
        title: 'Erro',
        description: 'Número de parcelas inválido',
        variant: 'destructive'
      });
      return;
    }

    if (numInstallments > totalUnpaidInstallments) {
      toast({
        title: 'Erro',
        description: `Número máximo de parcelas a pagar: ${totalUnpaidInstallments}`,
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Calculate total amount to pay
      let remainingInstallments = numInstallments;
      let totalAmount = 0;
      const transactionUpdates: Array<{ id: string; newPaidInstallments: number; installmentValue: number }> = [];

      for (const transaction of unpaidTransactions) {
        if (remainingInstallments === 0) break;

        const unpaidInThisTransaction = transaction.installments - transaction.paidInstallments;
        const toPay = Math.min(remainingInstallments, unpaidInThisTransaction);
        
        totalAmount += toPay * transaction.installmentValue;
        transactionUpdates.push({
          id: transaction.id,
          newPaidInstallments: transaction.paidInstallments + toPay,
          installmentValue: transaction.installmentValue
        });

        remainingInstallments -= toPay;
      }

      // Check if account has enough balance
      if (linkedAccount.balance < totalAmount) {
        toast({
          title: 'Saldo insuficiente',
          description: `Saldo da conta: ${linkedAccount.balance.toFixed(2)}. Valor necessário: ${totalAmount.toFixed(2)}`,
          variant: 'destructive'
        });
        return;
      }

      // Update account balance
      await supabase.rpc('update_account_balance', {
        p_account_id: linkedAccount.id,
        p_amount: totalAmount,
        p_transaction_type: 'expense'
      });

      // Update card transactions
      for (const update of transactionUpdates) {
        await supabase
          .from('card_transactions')
          .update({ paid_installments: update.newPaidInstallments })
          .eq('id', update.id);
      }

      // Update card used limit
      await supabase.rpc('update_card_limit', {
        p_card_id: card.id,
        p_amount: totalAmount,
        p_operation: 'subtract'
      });

      toast({
        title: 'Sucesso',
        description: `${numInstallments} parcela(s) paga(s). Total: ${totalAmount.toFixed(2)}`
      });

      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['card_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao pagar fatura',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar Fatura - {card.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Conta vinculada: {linkedAccount?.name || 'N/A'}
            </p>
            <p className="text-sm text-muted-foreground">
              Saldo disponível: {linkedAccount?.balance.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-muted-foreground">
              Parcelas pendentes: {totalUnpaidInstallments}
            </p>
            <p className="text-sm text-muted-foreground">
              Limite usado: {card.usedLimit.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="installments">Número de Parcelas a Pagar</Label>
            <Input
              id="installments"
              type="number"
              min="1"
              max={totalUnpaidInstallments}
              value={installmentsToPay}
              onChange={(e) => setInstallmentsToPay(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handlePayInvoice} disabled={isLoading || totalUnpaidInstallments === 0}>
              {isLoading ? 'Pagando...' : 'Pagar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
