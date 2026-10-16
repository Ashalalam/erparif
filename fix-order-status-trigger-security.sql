-- Fix: Allow order status history trigger to work for customer orders
-- Problem: Trigger runs as invoking user (customer), but customers lack INSERT on order_status_history
-- Solution: Use SECURITY DEFINER so trigger executes with owner's permissions

-- Drop and recreate the trigger function with SECURITY DEFINER
DROP FUNCTION IF EXISTS log_order_status_change() CASCADE;

CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER
SECURITY DEFINER  -- Execute with owner's permissions, not invoking user's
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
    INSERT INTO order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      auth.uid(),  -- The user who triggered the change
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'Order created'
        ELSE 'Status updated'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_order_status_change ON customer_orders;

CREATE TRIGGER on_order_status_change
  AFTER INSERT OR UPDATE OF status ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

-- Verify the function is set to SECURITY DEFINER
SELECT 
  p.proname as function_name,
  p.prosecdef as is_security_definer,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
WHERE p.proname = 'log_order_status_change';
