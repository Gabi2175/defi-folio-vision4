import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export type PeriodFilter = 'week' | 'month' | 'year' | 'all';

interface TransactionPeriodFilterProps {
  value: PeriodFilter;
  onChange: (value: PeriodFilter) => void;
}

export const filterTransactionsByPeriod = <T extends { date: string }>(
  transactions: T[],
  period: PeriodFilter
): T[] => {
  if (period === 'all') return transactions;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return transactions.filter((t) => {
    const transactionDate = new Date(t.date);

    switch (period) {
      case 'week': {
        // Get start of current week (Sunday)
        const dayOfWeek = startOfToday.getDay();
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - dayOfWeek);
        return transactionDate >= startOfWeek;
      }
      case 'month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return transactionDate >= startOfMonth;
      }
      case 'year': {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return transactionDate >= startOfYear;
      }
      default:
        return true;
    }
  });
};

export const TransactionPeriodFilter = ({ value, onChange }: TransactionPeriodFilterProps) => {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="week">Semana Atual</SelectItem>
          <SelectItem value="month">Mês Atual</SelectItem>
          <SelectItem value="year">Ano Atual</SelectItem>
          <SelectItem value="all">Todas</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
