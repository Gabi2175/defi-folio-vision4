-- Create cards table
CREATE TABLE public.cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  credit_limit NUMERIC NOT NULL CHECK (credit_limit >= 0),
  used_limit NUMERIC NOT NULL DEFAULT 0 CHECK (used_limit >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create card_transactions table
CREATE TABLE public.card_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
  installments INTEGER NOT NULL CHECK (installments > 0),
  paid_installments INTEGER NOT NULL DEFAULT 0 CHECK (paid_installments >= 0),
  installment_value NUMERIC NOT NULL CHECK (installment_value > 0),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cards
CREATE POLICY "Users can manage their own cards" 
ON public.cards 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for card_transactions
CREATE POLICY "Users can manage their own card transactions" 
ON public.card_transactions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for cards updated_at
CREATE TRIGGER update_cards_updated_at
BEFORE UPDATE ON public.cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_cards_user_id ON public.cards(user_id);
CREATE INDEX idx_cards_account_id ON public.cards(account_id);
CREATE INDEX idx_card_transactions_user_id ON public.card_transactions(user_id);
CREATE INDEX idx_card_transactions_card_id ON public.card_transactions(card_id);