import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Eye, EyeOff } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/hooks/useCurrency';
import { Account } from '@/types/finance';
import { formatDate } from '@/lib/calculations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  accounts?: { name: string };
}

const Accounts = () => {
  const { user } = useAuth();
  const { accounts, createAccount, updateAccount, deleteAccount } = useAccounts();
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const { toast } = useToast();

  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'bank' as 'bank' | 'investment' | 'crypto' | 'other',
    balance: '',
    currency: 'USD',
    notes: '',
  });

  const [transactionForm, setTransactionForm] = useState({
    accountId: '',
    type: 'expense' as 'income' | 'expense' | 'transfer',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    toAccountId: '',
    currency: 'USD' as 'USD' | 'BRL'
  });

  const resetAccountForm = () => {
    setAccountForm({
      name: '',
      type: 'bank',
      balance: '',
      currency: 'USD',
      notes: '',
    });
    setEditingAccount(null);
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      accountId: '',
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      toAccountId: '',
      currency: 'USD'
    });
  };

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!transactions_account_id_fkey(name)
      `)
      .order('date', { ascending: false })
      .limit(50);
    if (!error && data) setTransactions(data);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const accountData = {
      name: accountForm.name,
      type: accountForm.type,
      balance: parseFloat(accountForm.balance),
      currency: accountForm.currency,
      notes: accountForm.notes || undefined,
      isActive: true,
    };

    if (editingAccount) {
      updateAccount.mutate({ ...accountData, id: editingAccount.id } as Account, {
        onSuccess: () => {
          toast({
            title: 'Conta atualizada',
            description: 'A conta foi atualizada com sucesso.',
          });
          setAccountDialogOpen(false);
          resetAccountForm();
        },
        onError: () => {
          toast({
            title: 'Erro',
            description: 'Ocorreu um erro ao atualizar a conta.',
            variant: 'destructive',
          });
        }
      });
    } else {
      createAccount.mutate(accountData, {
        onSuccess: () => {
          toast({
            title: 'Conta adicionada',
            description: 'A conta foi adicionada com sucesso.',
          });
          setAccountDialogOpen(false);
          resetAccountForm();
        },
        onError: () => {
          toast({
            title: 'Erro',
            description: 'Ocorreu um erro ao adicionar a conta.',
            variant: 'destructive',
          });
        }
      });
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(transactionForm.amount);
    
    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: user!.id,
        type: transactionForm.type,
        amount,
        description: transactionForm.description,
        date: transactionForm.date,
        account_id: transactionForm.accountId || null,
        to_account_id: transactionForm.type === 'transfer' ? transactionForm.toAccountId : null,
      }]);
    
    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    
    loadTransactions();
    setTransactionDialogOpen(false);
    resetTransactionForm();
    
    toast({
      title: 'Transação adicionada',
      description: 'A transação foi registrada com sucesso.',
    });
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setAccountForm({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency,
      notes: account.notes || '',
    });
    setAccountDialogOpen(true);
  };

  const toggleAccountActive = async (account: Account) => {
    updateAccount.mutate(
      { ...account, isActive: !account.isActive },
      {
        onSuccess: () => {
          toast({
            title: account.isActive ? 'Conta desativada' : 'Conta ativada',
            description: `A conta ${account.name} foi ${account.isActive ? 'removida' : 'incluída'} dos cálculos.`,
          });
        },
      }
    );
  };

  const handleDeleteAccount = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      deleteAccount.mutate(id, {
        onSuccess: () => {
          toast({
            title: 'Conta excluída',
            description: 'A conta foi excluída com sucesso.',
          });
        },
        onError: () => {
          toast({
            title: 'Erro',
            description: 'Ocorreu um erro ao excluir a conta.',
            variant: 'destructive',
          });
        }
      });
    }
  };

  const totalBalance = accounts
    .filter(account => account.isActive)
    .reduce((sum, account) => sum + account.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Contas & Transações</h1>
          <p className="text-muted-foreground">Gerencie suas contas e registre movimentações</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={accountDialogOpen} onOpenChange={(open) => {
            setAccountDialogOpen(open);
            if (!open) resetAccountForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? 'Editar Conta' : 'Adicionar Nova Conta'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Conta</Label>
                  <Input
                    id="name"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={accountForm.type}
                    onValueChange={(value: 'bank' | 'investment' | 'crypto' | 'other') =>
                      setAccountForm({ ...accountForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Conta Bancária</SelectItem>
                      <SelectItem value="investment">Conta de Investimento</SelectItem>
                      <SelectItem value="crypto">Carteira Crypto</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="balance">Saldo Inicial</Label>
                    <Input
                      id="balance"
                      type="number"
                      step="0.01"
                      value={accountForm.balance}
                      onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moeda</Label>
                    <Input
                      id="currency"
                      value={accountForm.currency}
                      onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Input
                    id="notes"
                    value={accountForm.notes}
                    onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingAccount ? 'Atualizar' : 'Adicionar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={transactionDialogOpen} onOpenChange={(open) => {
            setTransactionDialogOpen(open);
            if (!open) resetTransactionForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Transação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTransactionSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transactionType">Tipo</Label>
                  <Select
                    value={transactionForm.type}
                    onValueChange={(value: 'income' | 'expense' | 'transfer') =>
                      setTransactionForm({ ...transactionForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="transfer">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountId">Conta</Label>
                  <Select
                    value={transactionForm.accountId}
                    onValueChange={(value) =>
                      setTransactionForm({ ...transactionForm, accountId: value })
                    }
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
                {transactionForm.type === 'transfer' && (
                  <div className="space-y-2">
                    <Label htmlFor="toAccountId">Para Conta</Label>
                    <Select
                      value={transactionForm.toAccountId}
                      onValueChange={(value) =>
                        setTransactionForm({ ...transactionForm, toAccountId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          .filter((a) => a.id !== transactionForm.accountId)
                          .map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={transactionForm.date}
                      onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda</Label>
                  <Select
                    value={transactionForm.currency}
                    onValueChange={(value: 'USD' | 'BRL') =>
                      setTransactionForm({ ...transactionForm, currency: value })
                    }
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
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={transactionForm.category}
                    onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Adicionar Transação
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(totalBalance)}</div>
          <p className="text-sm text-muted-foreground mt-1">
            {accounts.length} conta{accounts.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id} className={!account.isActive ? 'opacity-50' : ''}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleAccountActive(account)}
                      title={account.isActive ? 'Desativar conta' : 'Ativar conta'}
                    >
                      {account.isActive ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditAccount(account)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(account.balance)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {account.type} • {account.currency}
                  </p>
                  {account.notes && (
                    <p className="text-xs text-muted-foreground mt-2">{account.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Transações</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma transação registrada.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((transaction) => {
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell>{formatDate(transaction.date)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {transaction.type === 'income' && (
                                    <ArrowUpRight className="h-4 w-4 text-success" />
                                  )}
                                  {transaction.type === 'expense' && (
                                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                                  )}
                                  {transaction.type === 'transfer' && (
                                    <ArrowLeftRight className="h-4 w-4 text-primary" />
                                  )}
                                  <span className="capitalize">{transaction.type === 'transfer' ? 'Transferência' : transaction.type === 'income' ? 'Receita' : 'Despesa'}</span>
                                </div>
                              </TableCell>
                              <TableCell>{transaction.accounts?.name}</TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={
                                    transaction.type === 'income'
                                      ? 'text-success'
                                      : transaction.type === 'expense'
                                      ? 'text-destructive'
                                      : ''
                                  }
                                >
                                  {transaction.type === 'income' && '+'}
                                  {transaction.type === 'expense' && '-'}
                                  {formatCurrency(transaction.amount)}
                                </span>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Accounts;
