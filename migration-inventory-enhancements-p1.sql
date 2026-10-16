-- ============================================
-- INVENTORY ENHANCEMENTS - PRIORITY 1
-- ============================================
-- Features:
-- 1. Low-Stock Alerts
-- 2. Expiry Warnings
-- 3. Stock Movement History Support

-- ============================================
-- PART 1: LOW-STOCK ALERT SYSTEM
-- ============================================

-- Function to get medicines with low stock
CREATE OR REPLACE FUNCTION get_low_stock_medicines()
RETURNS TABLE (
  medicine_id UUID,
  medicine_name TEXT,
  generic_name TEXT,
  category TEXT,
  total_current_stock BIGINT,
  low_stock_threshold INTEGER,
  status TEXT,
  batch_count BIGINT,
  oldest_expiry DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as medicine_id,
    m.name as medicine_name,
    m.generic_name,
    m.category,
    COALESCE(SUM(mb.current_quantity), 0) as total_current_stock,
    m.low_stock_threshold,
    m.status,
    COUNT(mb.id) as batch_count,
    MIN(mb.expiry_date) as oldest_expiry
  FROM medicines m
  LEFT JOIN medicine_batches mb ON m.id = mb.medicine_id 
    AND mb.current_quantity > 0
  WHERE m.status = 'active'
  GROUP BY m.id, m.name, m.generic_name, m.category, m.low_stock_threshold, m.status
  HAVING COALESCE(SUM(mb.current_quantity), 0) <= m.low_stock_threshold
  ORDER BY COALESCE(SUM(mb.current_quantity), 0) ASC, m.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 2: EXPIRY WARNING SYSTEM
-- ============================================

-- Function to get expiring and expired batches
CREATE OR REPLACE FUNCTION get_expiring_batches(
  p_days_ahead INTEGER DEFAULT 90
)
RETURNS TABLE (
  batch_id UUID,
  medicine_id UUID,
  medicine_name TEXT,
  generic_name TEXT,
  batch_number TEXT,
  expiry_date DATE,
  current_quantity INTEGER,
  days_until_expiry INTEGER,
  expiry_status TEXT,
  selling_price DECIMAL(10,2),
  mrp DECIMAL(10,2),
  rack_location TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mb.id as batch_id,
    m.id as medicine_id,
    m.name as medicine_name,
    m.generic_name,
    mb.batch_number,
    mb.expiry_date,
    mb.current_quantity,
    (mb.expiry_date - CURRENT_DATE) as days_until_expiry,
    CASE 
      WHEN mb.expiry_date < CURRENT_DATE THEN 'expired'
      WHEN mb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'critical'
      WHEN mb.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'warning'
      ELSE 'approaching'
    END as expiry_status,
    mb.selling_price,
    mb.mrp,
    mb.rack_location
  FROM medicine_batches mb
  INNER JOIN medicines m ON mb.medicine_id = m.id
  WHERE mb.expiry_date <= CURRENT_DATE + (p_days_ahead || ' days')::INTERVAL
    AND mb.current_quantity > 0
    AND m.status = 'active'
  ORDER BY 
    CASE 
      WHEN mb.expiry_date < CURRENT_DATE THEN 0
      ELSE 1
    END,
    mb.expiry_date ASC,
    m.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: STOCK MOVEMENT HELPER VIEW
-- ============================================

-- View for enhanced stock movement display
CREATE OR REPLACE VIEW stock_movements_detailed AS
SELECT 
  sm.id,
  sm.movement_type,
  sm.quantity,
  sm.free_quantity,
  sm.reference_type,
  sm.reference_id,
  sm.reason,
  sm.created_at,
  -- Medicine details
  m.id as medicine_id,
  m.name as medicine_name,
  m.generic_name,
  m.category,
  -- Batch details
  mb.id as batch_id,
  mb.batch_number,
  mb.expiry_date,
  -- User details
  p.full_name as created_by_name,
  p.email as created_by_email,
  -- Additional context
  CASE sm.movement_type
    WHEN 'purchase' THEN '📦 Purchase'
    WHEN 'sale' THEN '💰 Sale'
    WHEN 'return' THEN '↩️ Return'
    WHEN 'adjustment' THEN '⚙️ Adjustment'
    WHEN 'damage' THEN '❌ Damage'
    WHEN 'expiry' THEN '⏰ Expiry'
    WHEN 'free' THEN '🎁 Free'
    WHEN 'transfer' THEN '🔄 Transfer'
    ELSE sm.movement_type
  END as movement_display
FROM stock_movements sm
INNER JOIN medicines m ON sm.medicine_id = m.id
LEFT JOIN medicine_batches mb ON sm.batch_id = mb.id
LEFT JOIN profiles p ON sm.created_by = p.id
ORDER BY sm.created_at DESC;

-- ============================================
-- PART 4: GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_low_stock_medicines() TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_batches(INTEGER) TO authenticated;
GRANT SELECT ON stock_movements_detailed TO authenticated;

-- ============================================
-- PART 5: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Inventory Enhancements - Priority 1 Installed';
  RAISE NOTICE '📦 Functions Created:';
  RAISE NOTICE '  - get_low_stock_medicines()';
  RAISE NOTICE '  - get_expiring_batches(days_ahead)';
  RAISE NOTICE '📊 Views Created:';
  RAISE NOTICE '  - stock_movements_detailed';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ready to use in admin dashboard!';
END $$;
