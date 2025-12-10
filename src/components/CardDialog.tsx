import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCards } from '@/hooks/useCards';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/hooks/useCurrency';
import { Card } from '@/types/finance';
import { cardSchema } from '@/lib/validations';

interface CardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: Card;
}

export function CardDialog({ open, onOpenChange, card }: CardDialogProps) {
  const { toast } = useToast();
  const { createCard, updateCard } = useCards();
  const { accounts } = useAccounts();
  const { exchangeRate } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    creditLimit: '',
    accountId: '',
    currency: 'USD' as 'USD' | 'BRL'
  });

  useEffect(() => {
    if (card) {
      setFormData({
        name: card.name,
        creditLimit: card.creditLimit.toString(),
        accountId: card.accountId,
        currency: 'USD'
      });
    } else {
      setFormData({ name: '', creditLimit: '', accountId: '', currency: 'USD' });
    }
  }, [card, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const creditLimitInput = parseFloat(formData.creditLimit);

      if (isNaN(creditLimitInput) || !isFinite(creditLimitInput)) {
        toast({
          title: 'Erro',
          description: 'Limite inválido',
          variant: 'destructive'
        });
        return;
      }

      const validation = cardSchema.safeParse({
        name: formData.name,
        creditLimit: creditLimitInput,
        accountId: formData.accountId,
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

      // Get the linked account to determine its currency
      const linkedAccount = accounts.find(acc => acc.id === formData.accountId);
      const accountCurrency = linkedAccount?.currency || 'USD';

      // Convert to account's currency if user entered in a different currency
      let creditLimit = creditLimitInput;
      if (formData.currency !== accountCurrency) {
        if (formData.currency === 'BRL' && accountCurrency === 'USD') {
          creditLimit = creditLimitInput / exchangeRate;
        } else if (formData.currency === 'USD' && accountCurrency === 'BRL') {
          creditLimit = creditLimitInput * exchangeRate;
        }
      }

      if (card) {
        await updateCard.mutateAsync({
          ...card,
          name: formData.name,
          creditLimit,
          accountId: formData.accountId
        });
        toast({
          title: 'Sucesso',
          description: 'Cartão atualizado com sucesso'
        });
      } else {
        await createCard.mutateAsync({
          name: formData.name,
          creditLimit,
          accountId: formData.accountId
        });
        toast({
          title: 'Sucesso',
          description: 'Cartão criado com sucesso'
        });
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar cartão',
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
          <DialogTitle>{card ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cartão</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Cartão Principal"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="creditLimit">Limite</Label>
            <Input
              id="creditLimit"
              type="number"
              step="0.01"
              min="0.01"
              max="1000000000"
              value={formData.creditLimit}
              onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
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
            <Label htmlFor="account">Conta Vinculada</Label>
            <Select
              value={formData.accountId}
              onValueChange={(value) => setFormData({ ...formData, accountId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
