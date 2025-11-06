import { useState, useEffect } from 'react';
import { Plus, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  account_id: string;
  category_id?: string;
  accounts?: { name: string };
  categories?: { name: string; color?: string };
}

const Expenses = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);

  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense' as 'income' | 'expense', color: '#3b82f6' });
  const [transactionForm, setTransactionForm] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    categoryId: ''
  });

  useEffect(() => {
    if (user) {
      loadCategories();
      loadAccounts();
      loadTransactions();
    }
  }, [user]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (!error && data) setCategories(data as Category[]);
  };

  const loadAccounts = async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name, balance')
      .order('name');
    if (!error && data) setAccounts(data);
  };

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!transactions_account_id_fkey(name),
        categories(name, color)
      `)
      .in('type', ['income', 'expense'])
      .order('date', { ascending: false });
    if (!error && data) setTransactions(data as Transaction[]);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('categories')
      .insert([{ ...categoryForm, user_id: user!.id }]);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Categoria criada com sucesso!' });
      setCategoryDialogOpen(false);
      setCategoryForm({ name: '', type: 'expense', color: '#3b82f6' });
      loadCategories();
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionForm.accountId) {
      toast({ title: 'Erro', description: 'Por favor, selecione uma conta.', variant: 'destructive' });
      return;
    }
    
    const amount = parseFloat(transactionForm.amount);

    const { error: transError } = await supabase
      .from('transactions')
      .insert([{
        user_id: user!.id,
        type: transactionForm.type,
        amount,
        description: transactionForm.description,
        date: transactionForm.date,
        account_id: transactionForm.accountId,
        category_id: transactionForm.categoryId || null
      }]);

    if (transError) {
      toast({ title: 'Erro', description: transError.message, variant: 'destructive' });
      return;
    }

    const account = accounts.find(a => a.id === transactionForm.accountId);
    if (account) {
      const newBalance = transactionForm.type === 'income' 
        ? account.balance + amount 
        : account.balance - amount;

      await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', transactionForm.accountId);
    }

    toast({ title: 'Transação registrada com sucesso!' });
    setTransactionDialogOpen(false);
    setTransactionForm({
      type: 'expense',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      accountId: '',
      categoryId: ''
    });
    loadTransactions();
    loadAccounts();
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyIncome = transactions
    .filter(t => {
      const date = new Date(t.date);
      return t.type === 'income' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthlyExpense = transactions
    .filter(t => {
      const date = new Date(t.date);
      return t.type === 'expense' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Controle de Gastos</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Categoria</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={categoryForm.type} onValueChange={(value: 'income' | 'expense') => setCategoryForm({ ...categoryForm, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Criar Categoria</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Transação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={transactionForm.type} onValueChange={(value: 'income' | 'expense') => setTransactionForm({ ...transactionForm, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta *</Label>
                  <Select value={transactionForm.accountId} onValueChange={(value) => setTransactionForm({ ...transactionForm, accountId: value })} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Nenhuma conta disponível. Crie uma conta primeiro.
                        </div>
                      ) : (
                        accounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={transactionForm.categoryId} onValueChange={(value) => setTransactionForm({ ...transactionForm, categoryId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.type === transactionForm.type).map(category => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Registrar Transação</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas (Total)</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas (Total)</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpense)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas (Mês)</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(monthlyIncome)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(monthlyExpense)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Transações</CardTitle>
              <CardDescription>Todas as suas receitas e despesas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${transaction.type === 'income' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {transaction.categories && (
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: transaction.categories.color }} />
                            {transaction.categories.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{transaction.accounts?.name}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className={`text-right font-semibold ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Categorias</CardTitle>
              <CardDescription>Gerencie suas categorias de receitas e despesas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                    <div className="flex-1">
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.type === 'income' ? 'Receita' : 'Despesa'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Expenses;
