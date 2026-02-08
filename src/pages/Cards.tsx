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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Cartões de Crédito</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie seus cartões e transações</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setTransactionDialogOpen(true)} className="flex-1 sm:flex-none text-xs sm:text-sm">
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Nova </span>Transação
          </Button>
          <Button onClick={handleNewCard} className="flex-1 sm:flex-none text-xs sm:text-sm">
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Novo </span>Cartão
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <CardTitle className="text-base sm:text-lg truncate">{card.name}</CardTitle>
                  </div>
                  <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => handleEditCard(card)}
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => openDeleteDialog(card.id)}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs sm:text-sm truncate">
                  {(card as any).accountName || 'Conta não encontrada'}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Limite Total</span>
                    <span className="font-medium truncate ml-2">{formatCurrency(card.creditLimit, (card as any).currency || 'USD')}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Usado</span>
                    <span className="font-medium text-destructive truncate ml-2">
                      {formatCurrency(card.usedLimit, (card as any).currency || 'USD')}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Disponível</span>
                    <span className="font-medium text-primary truncate ml-2">
                      {formatCurrency(availableLimit, (card as any).currency || 'USD')}
                    </span>
                  </div>
                  
                  <div className="w-full bg-secondary rounded-full h-1.5 sm:h-2">
                    <div
                      className="bg-primary h-1.5 sm:h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground text-right">
                    {usagePercentage.toFixed(1)}% usado
                  </p>
                </div>

                {unpaidInstallments > 0 && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs">
                    {unpaidInstallments} parcela{unpaidInstallments !== 1 ? 's' : ''} pendente{unpaidInstallments !== 1 ? 's' : ''}
                  </Badge>
                )}

                <Button
                  className="w-full text-xs sm:text-sm"
                  onClick={() => handlePayInvoice(card)}
                  disabled={unpaidInstallments === 0}
                >
                  <DollarSign className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Pagar Fatura
                </Button>
              </CardContent>
            </UICard>
          );
        })}
      </div>

      {transactions.length > 0 && (
        <UICard>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Transações Recentes</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Histórico de transações dos cartões</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Cartão</TableHead>
                    <TableHead className="whitespace-nowrap">Descrição</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">Valor Total</TableHead>
                    <TableHead className="whitespace-nowrap">Parcelas</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">Valor Parcela</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const card = cards.find(c => c.id === transaction.cardId);
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium whitespace-nowrap">{card?.name || 'N/A'}</TableCell>
                        <TableCell className="max-w-[100px] sm:max-w-none truncate">{transaction.description}</TableCell>
                        <TableCell className="hidden sm:table-cell whitespace-nowrap">{formatCurrency(transaction.totalAmount)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {transaction.paidInstallments}/{transaction.installments}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell whitespace-nowrap">{formatCurrency(transaction.installmentValue)}</TableCell>
                        <TableCell>
                          {transaction.paidInstallments === transaction.installments ? (
                            <Badge variant="default" className="text-[10px] sm:text-xs">Pago</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell whitespace-nowrap">
                          {new Date(transaction.transactionDate).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
