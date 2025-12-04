import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { useCurrency } from '@/hooks/useCurrency';
import { Asset } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';
import { AssetTransactionDialog } from '@/components/AssetTransactionDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const Assets = () => {
  const { assets, createAsset, updateAsset, deleteAsset } = useAssets();
  const { formatCurrency } = useCurrency();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    type: 'crypto' as 'crypto' | 'stock' | 'other',
    averagePrice: '',
    currentPrice: '',
    quantity: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      symbol: '',
      type: 'crypto',
      averagePrice: '',
      currentPrice: '',
      quantity: '',
      notes: '',
    });
    setEditingAsset(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const assetData = {
      name: formData.name,
      symbol: formData.symbol,
      type: formData.type,
      averagePrice: parseFloat(formData.averagePrice),
      currentPrice: parseFloat(formData.currentPrice),
      quantity: parseFloat(formData.quantity),
      notes: formData.notes || undefined,
    };

    if (editingAsset) {
      updateAsset.mutate({ ...assetData, id: editingAsset.id } as Asset, {
        onSuccess: () => {
          toast({
            title: 'Ativo atualizado',
            description: 'O ativo foi atualizado com sucesso.',
          });
          setDialogOpen(false);
          resetForm();
        },
        onError: () => {
          toast({
            title: 'Erro',
            description: 'Ocorreu um erro ao atualizar o ativo.',
            variant: 'destructive',
          });
        }
      });
    } else {
      createAsset.mutate(assetData, {
        onSuccess: () => {
          toast({
            title: 'Ativo adicionado',
            description: 'O ativo foi adicionado com sucesso.',
          });
          setDialogOpen(false);
          resetForm();
        },
        onError: () => {
          toast({
            title: 'Erro',
            description: 'Ocorreu um erro ao adicionar o ativo.',
            variant: 'destructive',
          });
        }
      });
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      symbol: asset.symbol,
      type: asset.type,
      averagePrice: asset.averagePrice.toString(),
      currentPrice: asset.currentPrice.toString(),
      quantity: asset.quantity.toString(),
      notes: asset.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este ativo?')) {
      deleteAsset.mutate(id, {
        onSuccess: () => {
          toast({
            title: 'Ativo excluído',
            description: 'O ativo foi excluído com sucesso.',
          });
        },
        onError: () => {
          toast({
            title: 'Erro',
            description: 'Ocorreu um erro ao excluir o ativo.',
            variant: 'destructive',
          });
        }
      });
    }
  };

  const calculatePNL = (asset: Asset) => {
    const invested = asset.averagePrice * asset.quantity;
    const current = asset.currentPrice * asset.quantity;
    const pnl = current - invested;
    const pnlPercentage = (pnl / invested) * 100;
    return { pnl, pnlPercentage };
  };

  const totalInvested = assets.reduce(
    (sum, asset) => sum + asset.averagePrice * asset.quantity,
    0
  );
  const totalCurrent = assets.reduce(
    (sum, asset) => sum + asset.currentPrice * asset.quantity,
    0
  );
  const totalPNL = totalCurrent - totalInvested;
  const totalPNLPercentage = totalInvested > 0 ? (totalPNL / totalInvested) * 100 : 0;

  const CHART_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const assetDistributionData = useMemo(() => {
    if (totalCurrent === 0) return [];
    return assets.map((asset, index) => ({
      name: asset.symbol,
      value: asset.currentPrice * asset.quantity,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [assets, totalCurrent]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Ativos</h1>
          <p className="text-muted-foreground">Controle seus preços médios e patrimônio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransactionDialogOpen(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Comprar/Vender
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Ativo
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAsset ? 'Editar Ativo' : 'Adicionar Novo Ativo'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Símbolo</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  placeholder="BTC, AAPL, etc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'crypto' | 'stock' | 'other') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crypto">Criptomoeda</SelectItem>
                    <SelectItem value="stock">Ação</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="averagePrice">Preço Médio</Label>
                  <Input
                    id="averagePrice"
                    type="number"
                    step="0.01"
                    value={formData.averagePrice}
                    onChange={(e) => setFormData({ ...formData, averagePrice: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentPrice">Preço Atual</Label>
                  <Input
                    id="currentPrice"
                    type="number"
                    step="0.01"
                    value={formData.currentPrice}
                    onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.00000001"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingAsset ? 'Atualizar' : 'Adicionar'}
              </Button>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCurrent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lucro/Prejuízo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold flex items-center ${
                totalPNL >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {totalPNL >= 0 ? (
                <TrendingUp className="mr-2 h-5 w-5" />
              ) : (
                <TrendingDown className="mr-2 h-5 w-5" />
              )}
              {formatCurrency(Math.abs(totalPNL))}
            </div>
            <p className={`text-sm mt-1 ${totalPNL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalPNL >= 0 ? '+' : ''}{totalPNLPercentage.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Distribution Chart */}
      {assets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={assetDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {assetDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum ativo cadastrado. Adicione seu primeiro ativo!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Símbolo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Preço Médio</TableHead>
                    <TableHead className="text-right">Preço Atual</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor Investido</TableHead>
                    <TableHead className="text-right">Valor Atual</TableHead>
                    <TableHead className="text-right">PNL</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => {
                    const { pnl, pnlPercentage } = calculatePNL(asset);
                    return (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{asset.symbol}</TableCell>
                        <TableCell className="capitalize">{asset.type}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.averagePrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.currentPrice)}
                        </TableCell>
                        <TableCell className="text-right">{asset.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.averagePrice * asset.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.currentPrice * asset.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={pnl >= 0 ? 'text-success' : 'text-destructive'}>
                            <div className="font-medium">{formatCurrency(pnl)}</div>
                            <div className="text-xs">
                              {pnl >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(asset)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(asset.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AssetTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        assets={assets}
      />
    </div>
  );
};

export default Assets;
