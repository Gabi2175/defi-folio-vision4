-- Fix search_path for existing function (without dropping)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

-- Create atomic balance update function to prevent race conditions
CREATE OR REPLACE FUNCTION public.update_account_balance(
  p_account_id UUID,
  p_amount DECIMAL,
  p_transaction_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_transaction_type = 'income' THEN
    UPDATE accounts 
    SET balance = balance + p_amount,
        updated_at = now()
    WHERE id = p_account_id AND user_id = auth.uid();
  ELSIF p_transaction_type = 'expense' THEN
    UPDATE accounts 
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE id = p_account_id AND user_id = auth.uid();
  ELSIF p_transaction_type = 'transfer_from' THEN
    UPDATE accounts 
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE id = p_account_id AND user_id = auth.uid();
  ELSIF p_transaction_type = 'transfer_to' THEN
    UPDATE accounts 
    SET balance = balance + p_amount,
        updated_at = now()
    WHERE id = p_account_id AND user_id = auth.uid();
  END IF;
END;
$$;