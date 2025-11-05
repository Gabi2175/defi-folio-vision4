import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Droplets, Coins } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { usePools } from '@/hooks/usePools';
import { useAccounts } from '@/hooks/useAccounts';
import { calculatePoolPNL, formatPercentage } from '@/lib/calculations';
import { useCurrency } from '@/hooks/useCurrency';
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const Dashboard = () => {
  const { assets } = useAssets();
  const { pools } = usePools();
  const { accounts } = useAccounts();
  const { formatCurrency } = useCurrency();

  const stats = useMemo(() => {
    const totalAssets = assets.reduce(
      (sum, asset) => sum + asset.currentPrice * asset.quantity,
      0
    );

    const poolsData = pools.map(calculatePoolPNL);
    const totalPoolValue = poolsData.reduce((sum, pnl) => sum + pnl.totalValue, 0);
    const totalPoolPNL = poolsData.reduce((sum, pnl) => sum + pnl.profitLoss, 0);
    const avgPoolPNLPercentage = poolsData.length
      ? poolsData.reduce((sum, pnl) => sum + pnl.profitLossPercentage, 0) / poolsData.length
      : 0;

    const totalAccounts = accounts.reduce((sum, account) => sum + account.balance, 0);

    const totalWealth = totalAssets + totalPoolValue + totalAccounts;

    return {
      totalAssets,
      totalPoolValue,
      totalPoolPNL,
      avgPoolPNLPercentage,
      totalAccounts,
      totalWealth,
      assetsCount: assets.length,
      poolsCount: pools.length,
      accountsCount: accounts.length,
    };
  }, [assets, pools, accounts]);

  const distributionData = [
    { name: 'Ativos', value: stats.totalAssets, color: 'hsl(var(--chart-1))' },
    { name: 'Pools', value: stats.totalPoolValue, color: 'hsl(var(--chart-2))' },
    { name: 'Contas', value: stats.totalAccounts, color: 'hsl(var(--chart-3))' },
  ];

  const mockPerformanceData = [
    { date: 'Jan', value: stats.totalWealth * 0.7 },
    { date: 'Fev', value: stats.totalWealth * 0.75 },
    { date: 'Mar', value: stats.totalWealth * 0.8 },
    { date: 'Abr', value: stats.totalWealth * 0.85 },
    { date: 'Mai', value: stats.totalWealth * 0.9 },
    { date: 'Jun', value: stats.totalWealth },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu patrimônio financeiro</p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Patrimônio Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalWealth)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valor consolidado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativos
            </CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAssets)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.assetsCount} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pools de Liquidez
            </CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPoolValue)}</div>
            <div className="flex items-center mt-1">
              {stats.avgPoolPNLPercentage >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-success mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-destructive mr-1" />
              )}
              <span
                className={`text-xs font-medium ${
                  stats.avgPoolPNLPercentage >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {formatPercentage(stats.avgPoolPNLPercentage)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contas
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAccounts)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.accountsCount} contas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Patrimônio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockPerformanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Patrimônio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
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
      </div>

      {/* Recent Pools */}
      {pools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pools Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pools.slice(0, 5).map((pool) => {
                const pnl = calculatePoolPNL(pool);
                return (
                  <div key={pool.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{pool.pairName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(pnl.totalValue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-medium ${
                          pnl.profitLossPercentage >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {formatPercentage(pnl.profitLossPercentage)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(pnl.profitLoss)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
