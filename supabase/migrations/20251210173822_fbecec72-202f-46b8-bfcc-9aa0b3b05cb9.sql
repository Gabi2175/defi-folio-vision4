-- Add currency column to cards table
ALTER TABLE public.cards 
ADD COLUMN currency text NOT NULL DEFAULT 'USD';