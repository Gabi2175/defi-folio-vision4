-- Create function to update card used limit
CREATE OR REPLACE FUNCTION public.update_card_limit(
  p_card_id uuid,
  p_amount numeric,
  p_operation text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_operation = 'add' THEN
    UPDATE cards 
    SET used_limit = used_limit + p_amount,
        updated_at = now()
    WHERE id = p_card_id AND user_id = auth.uid();
  ELSIF p_operation = 'subtract' THEN
    UPDATE cards 
    SET used_limit = used_limit - p_amount,
        updated_at = now()
    WHERE id = p_card_id AND user_id = auth.uid();
  END IF;
END;
$function$;