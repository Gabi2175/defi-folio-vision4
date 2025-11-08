-- Create atomic payment function to prevent race conditions
CREATE OR REPLACE FUNCTION public.pay_card_invoice(
  p_card_id uuid,
  p_account_id uuid,
  p_installments_to_pay integer,
  p_transaction_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_amount numeric := 0;
  v_account_balance numeric;
  v_update jsonb;
BEGIN
  -- Check account ownership
  IF NOT EXISTS (
    SELECT 1 FROM accounts 
    WHERE id = p_account_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized account access';
  END IF;
  
  -- Check card ownership
  IF NOT EXISTS (
    SELECT 1 FROM cards 
    WHERE id = p_card_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized card access';
  END IF;

  -- Calculate total amount from transaction updates
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_transaction_updates)
  LOOP
    v_total_amount := v_total_amount + (v_update->>'amount')::numeric;
  END LOOP;

  -- Check account has sufficient balance
  SELECT balance INTO v_account_balance FROM accounts WHERE id = p_account_id;
  IF v_account_balance < v_total_amount THEN
    RAISE EXCEPTION 'Insufficient account balance';
  END IF;

  -- ALL OPERATIONS IN TRANSACTION (automatic in function)
  
  -- 1. Update account balance
  UPDATE accounts 
  SET balance = balance - v_total_amount,
      updated_at = now()
  WHERE id = p_account_id AND user_id = auth.uid();

  -- 2. Update card transactions
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_transaction_updates)
  LOOP
    UPDATE card_transactions
    SET paid_installments = (v_update->>'newPaidInstallments')::integer
    WHERE id = (v_update->>'id')::uuid
      AND user_id = auth.uid();
  END LOOP;

  -- 3. Update card used limit
  UPDATE cards 
  SET used_limit = used_limit - v_total_amount,
      updated_at = now()
  WHERE id = p_card_id AND user_id = auth.uid();

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'total_amount', v_total_amount,
    'installments_paid', p_installments_to_pay
  );
END;
$function$;