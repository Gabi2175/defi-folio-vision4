import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Asset } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';
import { useAssets } from '@/hooks/useAssets';
import { assetTransactionSchema } from '@/lib/validations';

interface AssetTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
}

export const AssetTransactionDialog = ({ open, onOpenChange, assets }: AssetTransactionDialogProps) => {
  const { toast } = useToast();
  const { updateAsset } = useAssets();
  const [transactionForm, setTransactionForm] = useState({
    assetId: '',
    type: 'buy' as 'buy' | 'sell',
    price: '',
    quantity: '',
  });

  const resetForm = () => {
    setTransactionForm({
      assetId: '',
      type: 'buy',
      price: '',
      quantity: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedAsset = assets.find(a => a.id === transactionForm.assetId);
    if (!selectedAsset) {
      toast({
        title: 'Erro',
        description: 'Selecione um ativo válido.',
        variant: 'destructive',
      });
      return;
    }

    const price = parseFloat(transactionForm.price);
    const quantity = parseFloat(transactionForm.quantity);

    // Add NaN safety checks
    if (isNaN(price) || isNaN(quantity) || !isFinite(price) || !isFinite(quantity)) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira valores numéricos válidos.',
        variant: 'destructive',
      });
      return;
    }

    // Validate with Zod
    const validation = assetTransactionSchema.safeParse({
      assetId: transactionForm.assetId,
      type: transactionForm.type,
      price,
      quantity
    });

    if (!validation.success) {
      toast({
        title: 'Erro de validação',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    // Additional business logic validation
    if (transactionForm.type === 'sell') {
      if (quantity > selectedAsset.quantity) {
        toast({
          title: 'Erro',
          description: `Quantidade de venda (${quantity}) maior que a quantidade disponível (${selectedAsset.quantity}).`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Proceed with calculations (now safe from NaN)
    let newQuantity: number;
    let newAveragePrice: number;

    if (transactionForm.type === 'buy') {
      newQuantity = selectedAsset.quantity + quantity;
      newAveragePrice = (selectedAsset.averagePrice * selectedAsset.quantity + price * quantity) / newQuantity;
    } else {
      newQuantity = selectedAsset.quantity - quantity;
      newAveragePrice = selectedAsset.averagePrice;
    }

    const updatedAsset: Asset = {
      ...selectedAsset,
      quantity: newQuantity,
      averagePrice: newAveragePrice,
      currentPrice: price,
    };

    updateAsset.mutate(updatedAsset, {
      onSuccess: () => {
        toast({
          title: `${transactionForm.type === 'buy' ? 'Compra' : 'Venda'} registrada`,
          description: `Transação de ${quantity} ${selectedAsset.symbol} registrada com sucesso.`,
        });
        onOpenChange(false);
        resetForm();
      },
      onError: () => {
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao registrar a transação.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Compra/Venda de Ativo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assetId">Ativo</Label>
            <Select
              value={transactionForm.assetId}
              onValueChange={(value) => setTransactionForm({ ...transactionForm, assetId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um ativo" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name} ({asset.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Transação</Label>
            <Select
              value={transactionForm.type}
              onValueChange={(value: 'buy' | 'sell') => setTransactionForm({ ...transactionForm, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Compra</SelectItem>
                <SelectItem value="sell">Venda</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.00000001"
                  min="0.00000001"
                  max="1000000000"
                  value={transactionForm.price}
                  onChange={(e) => setTransactionForm({ ...transactionForm, price: e.target.value })}
                  required
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.00000001"
                  min="0.00000001"
                  max="1000000000"
                  value={transactionForm.quantity}
                  onChange={(e) => setTransactionForm({ ...transactionForm, quantity: e.target.value })}
                  required
                />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Registrar Transação
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
