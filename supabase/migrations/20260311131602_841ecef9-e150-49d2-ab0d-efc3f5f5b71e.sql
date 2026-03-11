CREATE OR REPLACE FUNCTION public.pay_card_invoice(p_card_id uuid, p_account_id uuid, p_installments_to_pay integer, p_transaction_updates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_amount numeric := 0;
  v_account_balance numeric;
  v_update jsonb;
  v_amount numeric;
  v_new_paid integer;
  v_tx_id uuid;
BEGIN
  -- Validate p_transaction_updates is a JSON array
  IF jsonb_typeof(p_transaction_updates) != 'array' THEN
    RAISE EXCEPTION 'p_transaction_updates must be a JSON array';
  END IF;

  -- Validate p_installments_to_pay is positive
  IF p_installments_to_pay <= 0 THEN
    RAISE EXCEPTION 'p_installments_to_pay must be positive';
  END IF;

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

  -- Validate and calculate total amount from transaction updates
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_transaction_updates)
  LOOP
    -- Validate required keys exist
    IF v_update->>'id' IS NULL OR v_update->>'amount' IS NULL OR v_update->>'newPaidInstallments' IS NULL THEN
      RAISE EXCEPTION 'Each transaction update must have id, amount, and newPaidInstallments';
    END IF;

    -- Parse and validate amount
    v_amount := (v_update->>'amount')::numeric;
    IF v_amount <= 0 THEN
      RAISE EXCEPTION 'Transaction amount must be positive';
    END IF;

    -- Parse and validate newPaidInstallments
    v_new_paid := (v_update->>'newPaidInstallments')::integer;
    IF v_new_paid <= 0 THEN
      RAISE EXCEPTION 'newPaidInstallments must be positive';
    END IF;

    -- Validate UUID format and ownership
    v_tx_id := (v_update->>'id')::uuid;
    IF NOT EXISTS (
      SELECT 1 FROM card_transactions
      WHERE id = v_tx_id AND user_id = auth.uid() AND card_id = p_card_id
    ) THEN
      RAISE EXCEPTION 'Transaction not found or unauthorized';
    END IF;

    v_total_amount := v_total_amount + v_amount;
  END LOOP;

  -- Check account has sufficient balance
  SELECT balance INTO v_account_balance FROM accounts WHERE id = p_account_id;
  IF v_account_balance < v_total_amount THEN
    RAISE EXCEPTION 'Insufficient account balance';
  END IF;

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