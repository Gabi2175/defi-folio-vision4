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
import { payInvoiceSchema } from '@/lib/validations';

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
    
    // Add NaN check
    if (isNaN(numInstallments)) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um número válido.',
        variant: 'destructive'
      });
      return;
    }

    // Validate with Zod
    const validation = payInvoiceSchema.safeParse({
      installments: numInstallments
    });

    if (!validation.success) {
      toast({
        title: 'Erro de validação',
        description: validation.error.errors[0].message,
        variant: 'destructive'
      });
      return;
    }

    // Business logic validation
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
      let totalAmount = 0;
      const transactionUpdates: Array<{
        id: string;
        newPaidInstallments: number;
        amount: number;
      }> = [];

      // Calculate total and prepare updates
      let remainingToPay = numInstallments;
      for (const transaction of unpaidTransactions) {
        if (remainingToPay <= 0) break;

        const unpaidInstallments = transaction.installments - transaction.paidInstallments;
        const toPay = Math.min(remainingToPay, unpaidInstallments);
        const amount = toPay * transaction.installmentValue;
        
        totalAmount += amount;
        transactionUpdates.push({
          id: transaction.id,
          newPaidInstallments: transaction.paidInstallments + toPay,
          amount: amount,
        });

        remainingToPay -= toPay;
      }

      // Check if account has sufficient balance
      if (linkedAccount.balance < totalAmount) {
        toast({
          title: 'Erro',
          description: `Saldo insuficiente. Saldo disponível: ${linkedAccount.balance.toFixed(2)}`,
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Single atomic RPC call
      const { data, error } = await supabase.rpc('pay_card_invoice', {
        p_card_id: card.id,
        p_account_id: linkedAccount.id,
        p_installments_to_pay: numInstallments,
        p_transaction_updates: transactionUpdates
      });

      if (error) throw error;

      const result = data as { success: boolean; total_amount: number; installments_paid: number };

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['card_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });

      toast({
        title: 'Sucesso',
        description: `${result.installments_paid} parcela(s) paga(s). Total: ${result.total_amount.toFixed(2)}`
      });

      onOpenChange(false);
      setInstallmentsToPay('1');
    } catch (error: any) {
      console.error('Error paying invoice:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao pagar fatura. Nenhuma alteração foi realizada.',
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
              max={Math.min(totalUnpaidInstallments, 1000)}
              step="1"
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
