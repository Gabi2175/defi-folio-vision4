import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { usePools } from '@/hooks/usePools';
import { useAssets } from '@/hooks/useAssets';
import { useCurrency } from '@/hooks/useCurrency';
import { LiquidityPool } from '@/types/finance';
import { calculatePoolPNL, formatDate } from '@/lib/calculations';
import { useToast } from '@/hooks/use-toast';
import { ClosePoolDialog } from '@/components/ClosePoolDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Pools = () => {
  const { pools, createPool, updatePool, deletePool } = usePools();
  const { assets } = useAssets();
  const { formatCurrency } = useCurrency();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [closePoolDialogOpen, setClosePoolDialogOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<LiquidityPool | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    asset1Symbol: '',
    asset2Symbol: '',
    pairName: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    initialInvestment: '',
    feesGenerated: '',
    rangePercentage: '',
    asset1CurrentPrice: '',
    asset2CurrentPrice: '',
    asset1Quantity: '',
    asset2Quantity: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      asset1Symbol: '',
      asset2Symbol: '',
      pairName: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      initialInvestment: '',
      feesGenerated: '',
      rangePercentage: '',
      asset1CurrentPrice: '',
      asset2CurrentPrice: '',
      asset1Quantity: '',
      asset2Quantity: '',
      notes: '',
    });
    setEditingPool(null);
  };

  const handleAssetSelect = (symbol: string, assetNum: 1 | 2) => {
    const asset = assets.find(a => a.symbol === symbol);
    if (asset) {
      if (assetNum === 1) {
        setFormData(prev => ({
          ...prev,
          asset1Symbol: symbol,
          asset1CurrentPrice: asset.currentPrice.toString(),
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          asset2Symbol: symbol,
          asset2CurrentPrice: asset.currentPrice.toString(),
        }));
      }
    } else {
      if (assetNum === 1) {
        setFormData(prev => ({ ...prev, asset1Symbol: symbol }));
      } else {
        setFormData(prev => ({ ...prev, asset2Symbol: symbol }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const poolData = {
      pairName: formData.pairName || `${formData.asset1Symbol}/${formData.asset2Symbol}`,
      asset1Symbol: formData.asset1Symbol,
      asset2Symbol: formData.asset2Symbol,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      initialInvestment: parseFloat(formData.initialInvestment),
      feesGenerated: parseFloat(formData.feesGenerated),
      rangePercentage: parseFloat(formData.rangePercentage),
      asset1CurrentPrice: parseFloat(formData.asset1CurrentPrice),
      asset2CurrentPrice: parseFloat(formData.asset2CurrentPrice),
      asset1Quantity: parseFloat(formData.asset1Quantity),
      asset2Quantity: parseFloat(formData.asset2Quantity),
      notes: formData.notes || undefined,
    };

    if (editingPool) {
      updatePool.mutate({ ...poolData, id: editingPool.id } as LiquidityPool, {
        onSuccess: () => {
          toast({
            title: 'Pool atualizada',
            description: 'A pool foi atualizada com sucesso.',
          });
          setDialogOpen(false);
          resetForm();
        },
        onError: () => {
          toast({
            title: 'Erro',
            description: 'Ocorreu um erro ao atualizar a pool.',
            variant: 'destructive',
          });
        }
      });
    } else {
      createPool.mutate(poolData, {
        onSuccess: () => {
          toast({
            title: 'Pool adicionada',
            description: 'A pool foi adicionada com sucesso.',
          });
          setDialogOpen(false);
          resetForm();
        },
        onError: () => {
          toast({
            title: 'Erro',
            description: 'Ocorreu um erro ao adicionar a pool.',
            variant: 'destructive',
          });
        }
      });
    }
  };

  const handleEdit = (pool: LiquidityPool) => {
    setEditingPool(pool);
    setFormData({
      asset1Symbol: pool.asset1Symbol,
      asset2Symbol: pool.asset2Symbol,
      pairName: pool.pairName,
      startDate: pool.startDate,
      endDate: pool.endDate || '',
      initialInvestment: pool.initialInvestment.toString(),
      feesGenerated: pool.feesGenerated.toString(),
      rangePercentage: pool.rangePercentage.toString(),
      asset1CurrentPrice: pool.asset1CurrentPrice.toString(),
      asset2CurrentPrice: pool.asset2CurrentPrice.toString(),
      asset1Quantity: pool.asset1Quantity.toString(),
      asset2Quantity: pool.asset2Quantity.toString(),
      notes: pool.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta pool?')) {
      deletePool.mutate(id, {
        onSuccess: () => {
          toast({
            title: 'Pool excluída',
            description: 'A pool foi excluída com sucesso.',
          });
        },
        onError: () => {
          toast({
            title: 'Erro',
            description: 'Ocorreu um erro ao excluir a pool.',
            variant: 'destructive',
          });
        }
      });
    }
  };

  const totalPools = pools.reduce((sum, pool) => {
    const pnl = calculatePoolPNL(pool);
    return sum + pnl.totalValue;
  }, 0);

  const totalInvested = pools.reduce((sum, pool) => sum + pool.initialInvestment, 0);
  const totalFees = pools.reduce((sum, pool) => sum + pool.feesGenerated, 0);
  const totalPNL = totalPools - totalInvested;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Pools de Liquidez</h1>
          <p className="text-muted-foreground">Gerencie suas pools e acompanhe o desempenho</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setClosePoolDialogOpen(true)} variant="outline">
            <X className="mr-2 h-4 w-4" />
            Fechar Pool
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Pool
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPool ? 'Editar Pool' : 'Adicionar Nova Pool'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asset1Symbol">Ativo 1</Label>
                  <Select
                    value={formData.asset1Symbol}
                    onValueChange={(value) => handleAssetSelect(value, 1)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione ou digite" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.symbol}>
                          {asset.symbol} - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Ou digite o símbolo"
                    value={formData.asset1Symbol}
                    onChange={(e) => handleAssetSelect(e.target.value, 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset2Symbol">Ativo 2</Label>
                  <Select
                    value={formData.asset2Symbol}
                    onValueChange={(value) => handleAssetSelect(value, 2)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione ou digite" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.symbol}>
                          {asset.symbol} - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Ou digite o símbolo"
                    value={formData.asset2Symbol}
                    onChange={(e) => handleAssetSelect(e.target.value, 2)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pairName">Nome do Par (opcional)</Label>
                <Input
                  id="pairName"
                  value={formData.pairName}
                  onChange={(e) => setFormData({ ...formData, pairName: e.target.value })}
                  placeholder={`${formData.asset1Symbol || 'ATIVO1'}/${formData.asset2Symbol || 'ATIVO2'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Fim (opcional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialInvestment">Aporte Inicial</Label>
                  <Input
                    id="initialInvestment"
                    type="number"
                    step="0.01"
                    value={formData.initialInvestment}
                    onChange={(e) => setFormData({ ...formData, initialInvestment: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feesGenerated">Taxas Geradas</Label>
                  <Input
                    id="feesGenerated"
                    type="number"
                    step="0.01"
                    value={formData.feesGenerated}
                    onChange={(e) => setFormData({ ...formData, feesGenerated: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rangePercentage">Range (%)</Label>
                  <Input
                    id="rangePercentage"
                    type="number"
                    step="0.01"
                    value={formData.rangePercentage}
                    onChange={(e) => setFormData({ ...formData, rangePercentage: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asset1CurrentPrice">Preço Atual Ativo 1</Label>
                  <Input
                    id="asset1CurrentPrice"
                    type="number"
                    step="0.00000001"
                    value={formData.asset1CurrentPrice}
                    onChange={(e) => setFormData({ ...formData, asset1CurrentPrice: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset2CurrentPrice">Preço Atual Ativo 2</Label>
                  <Input
                    id="asset2CurrentPrice"
                    type="number"
                    step="0.00000001"
                    value={formData.asset2CurrentPrice}
                    onChange={(e) => setFormData({ ...formData, asset2CurrentPrice: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asset1Quantity">Quantidade Ativo 1</Label>
                  <Input
                    id="asset1Quantity"
                    type="number"
                    step="0.00000001"
                    value={formData.asset1Quantity}
                    onChange={(e) => setFormData({ ...formData, asset1Quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset2Quantity">Quantidade Ativo 2</Label>
                  <Input
                    id="asset2Quantity"
                    type="number"
                    step="0.00000001"
                    value={formData.asset2Quantity}
                    onChange={(e) => setFormData({ ...formData, asset2Quantity: e.target.value })}
                    required
                  />
                </div>
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
                {editingPool ? 'Atualizar' : 'Adicionar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      <ClosePoolDialog 
        open={closePoolDialogOpen} 
        onOpenChange={setClosePoolDialogOpen} 
        pools={pools} 
      />

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPools)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxas Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFees)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PNL Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPNL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totalPNL)}
            </div>
            <p className={`text-sm mt-1 ${totalPNL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalInvested > 0 ? `${((totalPNL / totalInvested) * 100).toFixed(2)}%` : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pools Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pools</CardTitle>
        </CardHeader>
        <CardContent>
          {pools.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma pool cadastrada. Adicione sua primeira pool!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Par</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead className="text-right">Aporte</TableHead>
                    <TableHead className="text-right">Taxas</TableHead>
                    <TableHead className="text-right">Range</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">PNL</TableHead>
                    <TableHead className="text-right">PNL %</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pools.map((pool) => {
                    const pnl = calculatePoolPNL(pool);
                    return (
                      <TableRow key={pool.id}>
                        <TableCell className="font-medium">{pool.pairName}</TableCell>
                        <TableCell>{formatDate(pool.startDate)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(pool.initialInvestment)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(pool.feesGenerated)}
                        </TableCell>
                        <TableCell className="text-right">{pool.rangePercentage}%</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(pnl.totalValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={pnl.profitLoss >= 0 ? 'text-success' : 'text-destructive'}>
                            {formatCurrency(pnl.profitLoss)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${pnl.profitLossPercentage >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {pnl.profitLossPercentage >= 0 ? '+' : ''}{pnl.profitLossPercentage.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(pool)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(pool.id)}
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
    </div>
  );
};

export default Pools;
