import { useState, useRef, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onChange: (ids: string[]) => void;
}

export const CategoryFilter = ({ categories, selectedCategoryIds, onChange }: CategoryFilterProps) => {
  const hasSelection = selectedCategoryIds.length > 0;

  const toggleCategory = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      onChange(selectedCategoryIds.filter(cid => cid !== id));
    } else {
      onChange([...selectedCategoryIds, id]);
    }
  };

  const clearAll = () => onChange([]);
  const selectAll = () => onChange(categories.map(c => c.id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm">
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Categorias</span>
          {hasSelection && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
              {selectedCategoryIds.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="flex items-center justify-between px-2 pb-2 border-b mb-2">
          <span className="text-xs font-medium text-muted-foreground">Filtrar por categoria</span>
          <button
            onClick={hasSelection ? clearAll : selectAll}
            className="text-xs text-primary hover:underline"
          >
            {hasSelection ? 'Limpar' : 'Todas'}
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhuma categoria criada</p>
          ) : (
            categories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selectedCategoryIds.includes(cat.id)}
                  onCheckedChange={() => toggleCategory(cat.id)}
                />
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color || '#888' }}
                />
                <span className="text-sm truncate">{cat.name}</span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
