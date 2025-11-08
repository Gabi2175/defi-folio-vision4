import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCards } from '@/hooks/useCards';
import { useAccounts } from '@/hooks/useAccounts';
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
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    creditLimit: '',
    accountId: ''
  });

  useEffect(() => {
    if (card) {
      setFormData({
        name: card.name,
        creditLimit: card.creditLimit.toString(),
        accountId: card.accountId
      });
    } else {
      setFormData({ name: '', creditLimit: '', accountId: '' });
    }
  }, [card, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const creditLimit = parseFloat(formData.creditLimit);

      if (isNaN(creditLimit) || !isFinite(creditLimit)) {
        toast({
          title: 'Erro',
          description: 'Limite inválido',
          variant: 'destructive'
        });
        return;
      }

      const validation = cardSchema.safeParse({
        name: formData.name,
        creditLimit,
        accountId: formData.accountId
      });

      if (!validation.success) {
        toast({
          title: 'Erro de validação',
          description: validation.error.errors[0].message,
          variant: 'destructive'
        });
        return;
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
