import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Coins, 
  Droplets, 
  Wallet,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Ativos', href: '/assets', icon: Coins },
  { name: 'Pools de Liquidez', href: '/pools', icon: Droplets },
  { name: 'Contas', href: '/accounts', icon: Wallet },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

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

      <div className="lg:grid lg:grid-cols-[250px_1fr]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block border-r border-border bg-card h-screen sticky top-0">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-8">FinanceControl</h1>
            <nav className="space-y-2">
              <NavLinks />
            </nav>
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
