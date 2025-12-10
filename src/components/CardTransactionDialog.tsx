import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCards } from '@/hooks/useCards';
import { useCardTransactions } from '@/hooks/useCardTransactions';
import { useCurrency } from '@/hooks/useCurrency';
import { cardTransactionSchema } from '@/lib/validations';

interface CardTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardTransactionDialog({ open, onOpenChange }: CardTransactionDialogProps) {
  const { toast } = useToast();
  const { cards } = useCards();
  const { createTransaction } = useCardTransactions();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    cardId: '',
    description: '',
    totalAmount: '',
    installments: '1',
    currency: 'USD' as 'USD' | 'BRL'
  });

  useEffect(() => {
    if (!open) {
      setFormData({ cardId: '', description: '', totalAmount: '', installments: '1', currency: 'USD' });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const totalAmount = parseFloat(formData.totalAmount);
      const installments = parseInt(formData.installments);

      if (isNaN(totalAmount) || !isFinite(totalAmount) || isNaN(installments)) {
        toast({
          title: 'Erro',
          description: 'Valores inválidos',
          variant: 'destructive'
        });
        return;
      }

      const validation = cardTransactionSchema.safeParse({
        cardId: formData.cardId,
        description: formData.description,
        totalAmount,
        installments,
        currency: formData.currency
      });

      if (!validation.success) {
        toast({
          title: 'Erro de validação',
          description: validation.error.errors[0].message,
          variant: 'destructive'
        });
        return;
      }

      // Check if card has enough limit
      const selectedCard = cards.find(c => c.id === formData.cardId);
      if (!selectedCard) {
        toast({
          title: 'Erro',
          description: 'Cartão não encontrado',
          variant: 'destructive'
        });
        return;
      }

      // Get the card's native currency
      const cardCurrency = (selectedCard as any).currency || 'USD';
      
      // Convert amount if transaction currency differs from card currency
      let finalAmount = totalAmount;
      const { exchangeRate } = useCurrency.getState();
      
      if (formData.currency !== cardCurrency) {
        if (formData.currency === 'BRL' && cardCurrency === 'USD') {
          // User entered BRL, card is USD: convert BRL to USD
          finalAmount = totalAmount / exchangeRate;
        } else if (formData.currency === 'USD' && cardCurrency === 'BRL') {
          // User entered USD, card is BRL: convert USD to BRL
          finalAmount = totalAmount * exchangeRate;
        }
      }

      const availableLimit = selectedCard.creditLimit - selectedCard.usedLimit;
      if (finalAmount > availableLimit) {
        toast({
          title: 'Limite insuficiente',
          description: `Limite disponível: ${availableLimit.toFixed(2)} ${cardCurrency}. Valor da transação: ${finalAmount.toFixed(2)} ${cardCurrency}`,
          variant: 'destructive'
        });
        return;
      }

      await createTransaction.mutateAsync({
        cardId: formData.cardId,
        description: formData.description,
        totalAmount: finalAmount,
        installments,
        transactionDate: new Date().toISOString()
      });

      toast({
        title: 'Sucesso',
        description: 'Transação criada com sucesso'
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar transação',
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
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card">Cartão</Label>
            <Select
              value={formData.cardId}
              onValueChange={(value) => setFormData({ ...formData, cardId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cartão" />
              </SelectTrigger>
              <SelectContent>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name} - Disponível: {(card.creditLimit - card.usedLimit).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Compra na loja X"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Valor Total</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              min="0.01"
              max="1000000000"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Moeda</Label>
            <Select
              value={formData.currency}
              onValueChange={(value: 'USD' | 'BRL') => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD (Dólar)</SelectItem>
                <SelectItem value="BRL">BRL (Real)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="installments">Número de Parcelas</Label>
            <Input
              id="installments"
              type="number"
              min="1"
              max="48"
              value={formData.installments}
              onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
