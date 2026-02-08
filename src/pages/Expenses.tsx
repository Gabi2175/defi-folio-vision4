import { useState, useEffect, useMemo } from 'react';
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
import { getUserFriendlyError } from '@/lib/errorHandler';
import { transactionSchema, categorySchema } from '@/lib/validations';
import { TransactionPeriodFilter, PeriodFilter, filterTransactionsByPeriod } from '@/components/TransactionPeriodFilter';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
}

interface SimpleAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  account_id: string;
  category_id?: string;
  accounts?: { name: string; currency: string };
  categories?: { name: string; color?: string };
}

const Expenses = () => {
  const { user } = useAuth();
  const { formatCurrency, currency: viewingCurrency, exchangeRate } = useCurrency();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<SimpleAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionPeriodFilter, setTransactionPeriodFilter] = useState<PeriodFilter>('month');

  const filteredTransactions = useMemo(() => {
    return filterTransactionsByPeriod(transactions, transactionPeriodFilter);
  }, [transactions, transactionPeriodFilter]);
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense' as 'income' | 'expense', color: '#3b82f6' });
  const [transactionForm, setTransactionForm] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    categoryId: '',
    currency: 'USD' as 'USD' | 'BRL'
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
      .select('id, name, balance, currency')
      .order('name');
    if (!error && data) setAccounts(data);
  };

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!transactions_account_id_fkey(name, currency),
        categories(name, color)
      `)
      .in('type', ['income', 'expense'])
      .order('date', { ascending: false });
    if (!error && data) setTransactions(data as Transaction[]);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = categorySchema.safeParse(categoryForm);
    if (!validation.success) {
      toast({ 
        title: 'Erro de validação', 
        description: validation.error.errors[0].message, 
        variant: 'destructive' 
      });
      return;
    }
    
    const { error } = await supabase
      .from('categories')
      .insert([{ ...categoryForm, user_id: user!.id }]);

    if (error) {
      if (import.meta.env.DEV) console.error('Create category error:', error);
      toast({ title: 'Erro', description: getUserFriendlyError(error), variant: 'destructive' });
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
    
    let amount = parseFloat(transactionForm.amount);
    
    // Validate input
    const validation = transactionSchema.safeParse({
      amount,
      description: transactionForm.description,
      date: transactionForm.date,
      type: transactionForm.type,
      accountId: transactionForm.accountId,
      categoryId: transactionForm.categoryId || undefined
    });
    
    if (!validation.success) {
      toast({ 
        title: 'Erro de validação', 
        description: validation.error.errors[0].message, 
        variant: 'destructive' 
      });
      return;
    }

    // Get the selected account to check its currency
    const selectedAccount = accounts.find(acc => acc.id === transactionForm.accountId);
    if (!selectedAccount) {
      toast({ title: 'Erro', description: 'Conta não encontrada.', variant: 'destructive' });
      return;
    }

    // Convert amount if currencies don't match
    const { convertValue, exchangeRate } = useCurrency.getState();
    if (transactionForm.currency !== selectedAccount.currency) {
      if (transactionForm.currency === 'BRL' && selectedAccount.currency === 'USD') {
        // User entered BRL, account is USD, so convert BRL to USD
        amount = amount / exchangeRate;
      } else if (transactionForm.currency === 'USD' && selectedAccount.currency === 'BRL') {
        // User entered USD, account is BRL, so convert USD to BRL
        amount = amount * exchangeRate;
      }
    }

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
      if (import.meta.env.DEV) console.error('Create transaction error:', transError);
      toast({ title: 'Erro', description: getUserFriendlyError(transError), variant: 'destructive' });
      return;
    }

    // Use atomic balance update function to prevent race conditions
    const { error: balanceError } = await supabase.rpc('update_account_balance', {
      p_account_id: transactionForm.accountId,
      p_amount: amount,
      p_transaction_type: transactionForm.type
    });

    if (balanceError) {
      if (import.meta.env.DEV) console.error('Update balance error:', balanceError);
      toast({ 
        title: 'Aviso', 
        description: 'Transação criada, mas houve um erro ao atualizar o saldo.', 
        variant: 'destructive' 
      });
    } else {
      toast({ title: 'Transação registrada com sucesso!' });
    }

    setTransactionDialogOpen(false);
    setTransactionForm({
      type: 'expense',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      accountId: '',
      categoryId: '',
      currency: 'USD'
    });
    loadTransactions();
    loadAccounts();
  };

  // Helper to convert transaction amount to viewing currency
  const convertTransactionAmount = (t: Transaction) => {
    const accountCurrency = (t.accounts?.currency as 'USD' | 'BRL') || 'USD';
    let amount = Number(t.amount);
    
    if (accountCurrency !== viewingCurrency) {
      if (accountCurrency === 'USD' && viewingCurrency === 'BRL') {
        amount = amount * exchangeRate;
      } else if (accountCurrency === 'BRL' && viewingCurrency === 'USD') {
        amount = amount / exchangeRate;
      }
    }
    return amount;
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + convertTransactionAmount(t), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + convertTransactionAmount(t), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyIncome = transactions
    .filter(t => {
      const date = new Date(t.date);
      return t.type === 'income' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + convertTransactionAmount(t), 0);

  const monthlyExpense = transactions
    .filter(t => {
      const date = new Date(t.date);
      return t.type === 'expense' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + convertTransactionAmount(t), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Controle de Gastos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Nova </span>Categoria
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
              <Button className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Nova </span>Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                  <Label>Moeda</Label>
                  <Select value={transactionForm.currency} onValueChange={(value: 'USD' | 'BRL') => setTransactionForm({ ...transactionForm, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD (Dólar)</SelectItem>
                      <SelectItem value="BRL">BRL (Real)</SelectItem>
                    </SelectContent>
                  </Select>
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

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Receitas (Total)</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-success truncate">{formatCurrency(totalIncome, viewingCurrency)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Despesas (Total)</CardTitle>
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-destructive truncate">{formatCurrency(totalExpense, viewingCurrency)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Receitas (Mês)</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-success truncate">{formatCurrency(monthlyIncome, viewingCurrency)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Despesas (Mês)</CardTitle>
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-destructive truncate">{formatCurrency(monthlyExpense, viewingCurrency)}</div>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Histórico de Transações</CardTitle>
                <CardDescription>Todas as suas receitas e despesas</CardDescription>
              </div>
              <TransactionPeriodFilter
                value={transactionPeriodFilter}
                onChange={setTransactionPeriodFilter}
              />
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
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        {transactions.length === 0 
                          ? 'Nenhuma transação registrada.'
                          : 'Nenhuma transação encontrada no período selecionado.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
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
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount), (transaction.accounts?.currency as 'USD' | 'BRL') || 'USD')}
                      </TableCell>
                    </TableRow>
                  ))
                  )}
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
