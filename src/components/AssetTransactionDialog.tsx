import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Asset } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';
import { useAssets } from '@/hooks/useAssets';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/hooks/useCurrency';
import { assetTransactionSchema } from '@/lib/validations';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface AssetTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
}

type PaymentSource = 'none' | 'account' | 'asset';

export const AssetTransactionDialog = ({ open, onOpenChange, assets }: AssetTransactionDialogProps) => {
  const { toast } = useToast();
  const { updateAsset } = useAssets();
  const { accounts } = useAccounts();
  const queryClient = useQueryClient();
  const exchangeRate = useCurrency((state) => state.exchangeRate);
  
  const [transactionForm, setTransactionForm] = useState({
    assetId: '',
    type: 'buy' as 'buy' | 'sell',
    price: '',
    quantity: '',
    accountId: '',
    // New fields for buy payment
    paymentSource: 'none' as PaymentSource,
    paymentAccountId: '',
    paymentCurrency: 'USD' as 'USD' | 'BRL',
    paymentAssetId: '',
  });

  const resetForm = () => {
    setTransactionForm({
      assetId: '',
      type: 'buy',
      price: '',
      quantity: '',
      accountId: '',
      paymentSource: 'none',
      paymentAccountId: '',
      paymentCurrency: 'USD',
      paymentAssetId: '',
    });
  };

  // Filter out the selected asset from payment asset options
  const availablePaymentAssets = useMemo(() => {
    return assets.filter(a => a.id !== transactionForm.assetId && a.quantity > 0);
  }, [assets, transactionForm.assetId]);

  // Calculate how much of the payment asset is needed
  const paymentAssetInfo = useMemo(() => {
    if (transactionForm.paymentSource !== 'asset' || !transactionForm.paymentAssetId) {
      return null;
    }
    
    const paymentAsset = assets.find(a => a.id === transactionForm.paymentAssetId);
    if (!paymentAsset || !transactionForm.price || !transactionForm.quantity) {
      return null;
    }

    const price = parseFloat(transactionForm.price);
    const quantity = parseFloat(transactionForm.quantity);
    if (isNaN(price) || isNaN(quantity)) return null;

    // Total cost in USD (asset prices are in USD)
    const totalCostUSD = price * quantity;
    
    // How many units of payment asset are needed
    const paymentAssetUnitsNeeded = totalCostUSD / paymentAsset.currentPrice;
    
    return {
      asset: paymentAsset,
      unitsNeeded: paymentAssetUnitsNeeded,
      hasEnough: paymentAsset.quantity >= paymentAssetUnitsNeeded,
    };
  }, [assets, transactionForm.paymentAssetId, transactionForm.paymentSource, transactionForm.price, transactionForm.quantity]);

  // Calculate total cost for account payment
  const accountPaymentInfo = useMemo(() => {
    if (transactionForm.paymentSource !== 'account' || !transactionForm.paymentAccountId) {
      return null;
    }
    
    const paymentAccount = accounts.find(a => a.id === transactionForm.paymentAccountId);
    if (!paymentAccount || !transactionForm.price || !transactionForm.quantity) {
      return null;
    }

    const price = parseFloat(transactionForm.price);
    const quantity = parseFloat(transactionForm.quantity);
    if (isNaN(price) || isNaN(quantity)) return null;

    // Total cost in USD (asset prices are in USD)
    const totalCostUSD = price * quantity;
    
    // Convert to payment currency if needed
    let amountToDeduct = totalCostUSD;
    if (transactionForm.paymentCurrency === 'BRL') {
      amountToDeduct = totalCostUSD * exchangeRate;
    }
    
    // Now convert to account's native currency if different
    let finalAmount = amountToDeduct;
    if (transactionForm.paymentCurrency !== paymentAccount.currency) {
      if (transactionForm.paymentCurrency === 'USD' && paymentAccount.currency === 'BRL') {
        finalAmount = amountToDeduct * exchangeRate;
      } else if (transactionForm.paymentCurrency === 'BRL' && paymentAccount.currency === 'USD') {
        finalAmount = amountToDeduct / exchangeRate;
      }
    }
    
    return {
      account: paymentAccount,
      amountToDeduct: finalAmount,
      displayAmount: amountToDeduct,
      displayCurrency: transactionForm.paymentCurrency,
      hasEnough: paymentAccount.balance >= finalAmount,
    };
  }, [accounts, transactionForm.paymentAccountId, transactionForm.paymentSource, transactionForm.price, transactionForm.quantity, transactionForm.paymentCurrency, exchangeRate]);

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

    // Validation for sell
    if (transactionForm.type === 'sell') {
      if (quantity > selectedAsset.quantity) {
        toast({
          title: 'Erro',
          description: `Quantidade de venda (${quantity}) maior que a quantidade disponível (${selectedAsset.quantity}).`,
          variant: 'destructive',
        });
        return;
      }

      if (!transactionForm.accountId) {
        toast({
          title: 'Erro',
          description: 'Selecione uma conta para receber o valor da venda.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validation for buy with payment source
    if (transactionForm.type === 'buy') {
      if (transactionForm.paymentSource === 'account') {
        if (!transactionForm.paymentAccountId) {
          toast({
            title: 'Erro',
            description: 'Selecione uma conta para debitar.',
            variant: 'destructive',
          });
          return;
        }
        if (accountPaymentInfo && !accountPaymentInfo.hasEnough) {
          toast({
            title: 'Erro',
            description: 'Saldo insuficiente na conta selecionada.',
            variant: 'destructive',
          });
          return;
        }
      }
      
      if (transactionForm.paymentSource === 'asset') {
        if (!transactionForm.paymentAssetId) {
          toast({
            title: 'Erro',
            description: 'Selecione um ativo para usar como pagamento.',
            variant: 'destructive',
          });
          return;
        }
        if (paymentAssetInfo && !paymentAssetInfo.hasEnough) {
          toast({
            title: 'Erro',
            description: `Quantidade insuficiente de ${paymentAssetInfo.asset.symbol}.`,
            variant: 'destructive',
          });
          return;
        }
      }
    }

    // Proceed with calculations
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

    try {
      // Handle payment source for buy transactions
      if (transactionForm.type === 'buy' && transactionForm.paymentSource !== 'none') {
        if (transactionForm.paymentSource === 'account' && accountPaymentInfo) {
          // Deduct from account
          const { error: accountError } = await supabase.rpc('update_account_balance', {
            p_account_id: transactionForm.paymentAccountId,
            p_amount: accountPaymentInfo.amountToDeduct,
            p_transaction_type: 'expense'
          });

          if (accountError) {
            toast({
              title: 'Erro',
              description: 'Erro ao debitar da conta.',
              variant: 'destructive',
            });
            return;
          }
        }
        
        if (transactionForm.paymentSource === 'asset' && paymentAssetInfo) {
          // Deduct from payment asset
          const paymentAsset = paymentAssetInfo.asset;
          const newPaymentAssetQuantity = paymentAsset.quantity - paymentAssetInfo.unitsNeeded;
          
          const { error: assetError } = await supabase
            .from('assets')
            .update({
              quantity: newPaymentAssetQuantity,
            })
            .eq('id', paymentAsset.id);

          if (assetError) {
            toast({
              title: 'Erro',
              description: 'Erro ao debitar do ativo de pagamento.',
              variant: 'destructive',
            });
            return;
          }
        }
      }

      // Handle sell - update account balance
      if (transactionForm.type === 'sell') {
        const saleAmount = price * quantity;
        
        const selectedAccount = accounts.find(a => a.id === transactionForm.accountId);
        const accountCurrency = selectedAccount?.currency || 'USD';
        
        let finalSaleAmount = saleAmount;
        if (accountCurrency === 'BRL') {
          finalSaleAmount = saleAmount * exchangeRate;
        }
        
        const { error: accountError } = await supabase.rpc('update_account_balance', {
          p_account_id: transactionForm.accountId,
          p_amount: finalSaleAmount,
          p_transaction_type: 'income'
        });

        if (accountError) {
          toast({
            title: 'Erro',
            description: 'Erro ao atualizar o saldo da conta.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Update the main asset
      updateAsset.mutate(updatedAsset, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
          queryClient.invalidateQueries({ queryKey: ['assets'] });
          
          let description = '';
          if (transactionForm.type === 'buy') {
            description = `Compra de ${quantity} ${selectedAsset.symbol} registrada`;
            if (transactionForm.paymentSource === 'account' && accountPaymentInfo) {
              description += `. Debitado ${accountPaymentInfo.displayCurrency} ${accountPaymentInfo.displayAmount.toFixed(2)} da conta.`;
            } else if (transactionForm.paymentSource === 'asset' && paymentAssetInfo) {
              description += `. Usado ${paymentAssetInfo.unitsNeeded.toFixed(8)} ${paymentAssetInfo.asset.symbol}.`;
            }
          } else {
            description = `Venda de ${quantity} ${selectedAsset.symbol} registrada. Valor depositado na conta.`;
          }
          
          toast({
            title: `${transactionForm.type === 'buy' ? 'Compra' : 'Venda'} registrada`,
            description,
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
        },
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Compra/Venda de Ativo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assetId">Ativo</Label>
            <Select
              value={transactionForm.assetId}
              onValueChange={(value) => setTransactionForm({ 
                ...transactionForm, 
                assetId: value,
                paymentAssetId: transactionForm.paymentAssetId === value ? '' : transactionForm.paymentAssetId 
              })}
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
              onValueChange={(value: 'buy' | 'sell') => setTransactionForm({ 
                ...transactionForm, 
                type: value,
                paymentSource: 'none',
                paymentAccountId: '',
                paymentAssetId: '',
              })}
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
              <Label htmlFor="price">Preço (USD)</Label>
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

          {/* Payment source for BUY transactions */}
          {transactionForm.type === 'buy' && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <Label className="text-sm font-medium">Fonte de Pagamento (opcional)</Label>
              <RadioGroup
                value={transactionForm.paymentSource}
                onValueChange={(value: PaymentSource) => setTransactionForm({
                  ...transactionForm,
                  paymentSource: value,
                  paymentAccountId: '',
                  paymentAssetId: '',
                })}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="font-normal cursor-pointer">Nenhum (registro apenas)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="account" id="account" />
                  <Label htmlFor="account" className="font-normal cursor-pointer">Usar conta bancária</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="asset" id="asset" />
                  <Label htmlFor="asset" className="font-normal cursor-pointer">Usar outro ativo</Label>
                </div>
              </RadioGroup>

              {/* Account payment options */}
              {transactionForm.paymentSource === 'account' && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="paymentAccountId">Conta para Debitar</Label>
                    <Select
                      value={transactionForm.paymentAccountId}
                      onValueChange={(value) => setTransactionForm({ ...transactionForm, paymentAccountId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.filter(a => a.isActive).map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.currency} {account.balance.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="paymentCurrency">Moeda do Gasto</Label>
                    <Select
                      value={transactionForm.paymentCurrency}
                      onValueChange={(value: 'USD' | 'BRL') => setTransactionForm({ ...transactionForm, paymentCurrency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD (Dólar)</SelectItem>
                        <SelectItem value="BRL">BRL (Real)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {accountPaymentInfo && (
                    <div className={`text-sm p-2 rounded ${accountPaymentInfo.hasEnough ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                      Valor a debitar: {transactionForm.paymentCurrency} {accountPaymentInfo.displayAmount.toFixed(2)}
                      {!accountPaymentInfo.hasEnough && ' (saldo insuficiente)'}
                    </div>
                  )}
                </div>
              )}

              {/* Asset payment options */}
              {transactionForm.paymentSource === 'asset' && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="paymentAssetId">Ativo para Usar</Label>
                    <Select
                      value={transactionForm.paymentAssetId}
                      onValueChange={(value) => setTransactionForm({ ...transactionForm, paymentAssetId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um ativo" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePaymentAssets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.symbol} (Disponível: {asset.quantity.toFixed(8)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentAssetInfo && (
                    <div className={`text-sm p-2 rounded ${paymentAssetInfo.hasEnough ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                      Necessário: {paymentAssetInfo.unitsNeeded.toFixed(8)} {paymentAssetInfo.asset.symbol}
                      {!paymentAssetInfo.hasEnough && ' (quantidade insuficiente)'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Destination account for SELL transactions */}
          {transactionForm.type === 'sell' && (
            <div className="space-y-2">
              <Label htmlFor="accountId">Conta de Destino *</Label>
              <Select
                value={transactionForm.accountId}
                onValueChange={(value) => setTransactionForm({ ...transactionForm, accountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.isActive).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="submit" className="w-full">
            Registrar Transação
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
