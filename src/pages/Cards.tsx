import { useState } from 'react';
import { Plus, CreditCard, Trash2, Edit, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCards } from '@/hooks/useCards';
import { useCardTransactions } from '@/hooks/useCardTransactions';
import { useCurrency } from '@/hooks/useCurrency';
import { CardDialog } from '@/components/CardDialog';
import { CardTransactionDialog } from '@/components/CardTransactionDialog';
import { PayInvoiceDialog } from '@/components/PayInvoiceDialog';
import { Card } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Cards() {
  const { cards, isLoading, deleteCard } = useCards();
  const { transactions } = useCardTransactions();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [payInvoiceDialogOpen, setPayInvoiceDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  const handleEditCard = (card: Card) => {
    setSelectedCard(card);
    setCardDialogOpen(true);
  };

  const handleNewCard = () => {
    setSelectedCard(null);
    setCardDialogOpen(true);
  };

  const handlePayInvoice = (card: Card) => {
    setSelectedCard(card);
    setPayInvoiceDialogOpen(true);
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;

    try {
      await deleteCard.mutateAsync(cardToDelete);
      toast({
        title: 'Sucesso',
        description: 'Cartão excluído com sucesso'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir cartão',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setCardToDelete(null);
    }
  };

  const openDeleteDialog = (cardId: string) => {
    setCardToDelete(cardId);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Gerencie seus cartões e transações</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTransactionDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
          <Button onClick={handleNewCard}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cartão
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const availableLimit = card.creditLimit - card.usedLimit;
          const usagePercentage = (card.usedLimit / card.creditLimit) * 100;
          const cardTransactions = transactions.filter(t => t.cardId === card.id);
          const unpaidInstallments = cardTransactions.reduce(
            (sum, t) => sum + (t.installments - t.paidInstallments),
            0
          );

          return (
            <UICard key={card.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    <CardTitle className="text-lg">{card.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditCard(card)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(card.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {(card as any).accountName || 'Conta não encontrada'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Limite Total</span>
                    <span className="font-medium">{formatCurrency(card.creditLimit, (card as any).currency || 'USD')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Usado</span>
                    <span className="font-medium text-destructive">
                      {formatCurrency(card.usedLimit, (card as any).currency || 'USD')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Disponível</span>
                    <span className="font-medium text-primary">
                      {formatCurrency(availableLimit, (card as any).currency || 'USD')}
                    </span>
                  </div>
                  
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {usagePercentage.toFixed(1)}% usado
                  </p>
                </div>

                {unpaidInstallments > 0 && (
                  <Badge variant="secondary">
                    {unpaidInstallments} parcela{unpaidInstallments !== 1 ? 's' : ''} pendente{unpaidInstallments !== 1 ? 's' : ''}
                  </Badge>
                )}

                <Button
                  className="w-full"
                  onClick={() => handlePayInvoice(card)}
                  disabled={unpaidInstallments === 0}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Pagar Fatura
                </Button>
              </CardContent>
            </UICard>
          );
        })}
      </div>

      {transactions.length > 0 && (
        <UICard>
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
            <CardDescription>Histórico de transações dos cartões</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cartão</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Valor Parcela</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const card = cards.find(c => c.id === transaction.cardId);
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{card?.name || 'N/A'}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{formatCurrency(transaction.totalAmount)}</TableCell>
                      <TableCell>
                        {transaction.paidInstallments}/{transaction.installments}
                      </TableCell>
                      <TableCell>{formatCurrency(transaction.installmentValue)}</TableCell>
                      <TableCell>
                        {transaction.paidInstallments === transaction.installments ? (
                          <Badge variant="default">Pago</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.transactionDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </UICard>
      )}

      <CardDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        card={selectedCard || undefined}
      />
      
      <CardTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
      />

      <PayInvoiceDialog
        open={payInvoiceDialogOpen}
        onOpenChange={setPayInvoiceDialogOpen}
        card={selectedCard}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita e todas as transações associadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCard}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
