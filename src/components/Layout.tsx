import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Coins, 
  Droplets, 
  Wallet,
  Menu,
  LogOut,
  TrendingDown,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import { exchangeRateSchema } from '@/lib/validations';
import { useToast } from '@/hooks/use-toast';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Ativos', href: '/assets', icon: Coins },
  { name: 'Pools de Liquidez', href: '/pools', icon: Droplets },
  { name: 'Contas', href: '/accounts', icon: Wallet },
  { name: 'Gastos', href: '/expenses', icon: TrendingDown },
  { name: 'Cartões', href: '/cards', icon: CreditCard },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const { currency, setCurrency, exchangeRate, setExchangeRate } = useCurrency();
  const { toast } = useToast();

  const handleExchangeRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    
    if (isNaN(value)) {
      setExchangeRate(5.0);
      return;
    }

    const validation = exchangeRateSchema.safeParse({ rate: value });
    
    if (validation.success) {
      setExchangeRate(value);
    } else {
      toast({
        title: 'Cotação inválida',
        description: validation.error.errors[0].message,
        variant: 'destructive'
      });
      setExchangeRate(5.0);
    }
  };

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">FinanceControl</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-6">Menu</h2>
                <nav className="space-y-2">
                  <NavLinks />
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[250px_1fr]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block border-r border-border bg-card h-screen sticky top-0">
          <div className="p-6 flex flex-col h-full">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-8">FinanceControl</h1>
              <nav className="space-y-2">
                <NavLinks />
              </nav>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Tema</span>
                <ThemeToggle />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Moeda
                </label>
                <Select value={currency} onValueChange={(value: 'USD' | 'BRL') => setCurrency(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Cotação (1 USD = ? BRL)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10000"
                  value={exchangeRate}
                  onChange={handleExchangeRateChange}
                  onBlur={() => {
                    if (exchangeRate <= 0) setExchangeRate(5.0);
                  }}
                  className="w-full"
                />
              </div>
              <Button variant="outline" className="w-full" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
