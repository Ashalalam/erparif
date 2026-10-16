-- =====================================================
-- DELIVERY TRACKING SYSTEM
-- =====================================================
-- Real-time GPS tracking, delivery personnel management,
-- and estimated delivery time calculations

-- =====================================================
-- 1. DELIVERY PERSONNEL TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Personal Info
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  profile_photo_url TEXT,
  
  -- Identification
  employee_id TEXT UNIQUE,
  license_number TEXT, -- Driving license
  vehicle_type TEXT CHECK (vehicle_type IN ('bike', 'scooter', 'car', 'van', 'bicycle')),
  vehicle_number TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  current_location_lat DECIMAL(10, 8),
  current_location_lng DECIMAL(11, 8),
  last_location_update TIMESTAMPTZ,
  
  -- Stats
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. DELIVERY TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  delivery_person_id UUID REFERENCES delivery_personnel(id) ON DELETE SET NULL,
  
  -- Delivery Status
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN (
    'assigned',      -- Assigned to delivery person
    'picked_up',     -- Picked up from pharmacy
    'in_transit',    -- On the way to customer
    'nearby',        -- Within 1km of destination
    'arrived',       -- Arrived at customer location
    'delivered',     -- Successfully delivered
    'failed',        -- Delivery failed
    'returned'       -- Returned to pharmacy
  )),
  
  -- Location Tracking
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  
  -- Distance & Time
  distance_km DECIMAL(6, 2), -- Total distance in km
  estimated_time_minutes INTEGER, -- Estimated time to reach
  actual_travel_time_minutes INTEGER, -- Actual time taken
  
  -- Timestamps
  assigned_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Additional Info
  delivery_notes TEXT,
  failure_reason TEXT,
  customer_signature_url TEXT,
  delivery_photo_url TEXT,
  
  -- Customer Feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(order_id)
);

-- =====================================================
-- 3. DELIVERY LOCATION HISTORY (GPS Breadcrumbs)
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_tracking_id UUID NOT NULL REFERENCES delivery_tracking(id) ON DELETE CASCADE,
  delivery_person_id UUID REFERENCES delivery_personnel(id) ON DELETE CASCADE,
  
  -- Location
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(6, 2), -- GPS accuracy in meters
  
  -- Metadata
  speed_kmh DECIMAL(5, 2), -- Speed in km/h
  heading DECIMAL(5, 2), -- Direction (0-360 degrees)
  altitude DECIMAL(7, 2), -- Altitude in meters
  
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. DELIVERY ZONES (For ETA Calculations)
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name TEXT NOT NULL,
  pincode TEXT,
  
  -- Geographic Boundary (Simple box for now)
  min_lat DECIMAL(10, 8),
  max_lat DECIMAL(10, 8),
  min_lng DECIMAL(11, 8),
  max_lng DECIMAL(11, 8),
  
  -- Delivery Settings
  base_delivery_charge DECIMAL(10, 2) DEFAULT 0,
  estimated_time_minutes INTEGER, -- Average delivery time
  is_serviceable BOOLEAN DEFAULT true,
  priority_order INTEGER DEFAULT 0, -- For zone overlap resolution
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_delivery_personnel_active 
  ON delivery_personnel(is_active, is_available);

CREATE INDEX IF NOT EXISTS idx_delivery_personnel_location 
  ON delivery_personnel(current_location_lat, current_location_lng);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order 
  ON delivery_tracking(order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_person 
  ON delivery_tracking(delivery_person_id);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_status 
  ON delivery_tracking(status);

CREATE INDEX IF NOT EXISTS idx_delivery_location_history_tracking 
  ON delivery_location_history(delivery_tracking_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_pincode 
  ON delivery_zones(pincode);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE delivery_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Delivery Personnel Policies
CREATE POLICY "Admin can view all delivery personnel"
  ON delivery_personnel FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'pharmacist', 'staff')
    )
  );

CREATE POLICY "Delivery person can view own profile"
  ON delivery_personnel FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage delivery personnel"
  ON delivery_personnel FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Delivery Tracking Policies
CREATE POLICY "Customers can view own delivery tracking"
  ON delivery_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_orders
      WHERE customer_orders.id = delivery_tracking.order_id
      AND customer_orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all delivery tracking"
  ON delivery_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'pharmacist', 'staff')
    )
  );

CREATE POLICY "Delivery person can view assigned deliveries"
  ON delivery_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM delivery_personnel
      WHERE delivery_personnel.id = delivery_tracking.delivery_person_id
      AND delivery_personnel.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage delivery tracking"
  ON delivery_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- Location History Policies
CREATE POLICY "Customers can view delivery location history"
  ON delivery_location_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM delivery_tracking dt
      JOIN customer_orders co ON co.id = dt.order_id
      WHERE dt.id = delivery_location_history.delivery_tracking_id
      AND co.customer_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all location history"
  ON delivery_location_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'pharmacist', 'staff')
    )
  );

CREATE POLICY "System can insert location history"
  ON delivery_location_history FOR INSERT
  WITH CHECK (true);

-- Delivery Zones Policies
CREATE POLICY "Anyone can view delivery zones"
  ON delivery_zones FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage delivery zones"
  ON delivery_zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger for delivery_personnel
CREATE OR REPLACE FUNCTION update_delivery_personnel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_personnel_timestamp
  BEFORE UPDATE ON delivery_personnel
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_personnel_updated_at();

-- Update timestamp trigger for delivery_tracking
CREATE OR REPLACE FUNCTION update_delivery_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Auto-set timestamps based on status changes
  IF NEW.status = 'assigned' AND OLD.status IS DISTINCT FROM 'assigned' THEN
    NEW.assigned_at = NOW();
  ELSIF NEW.status = 'picked_up' AND OLD.status IS DISTINCT FROM 'picked_up' THEN
    NEW.picked_up_at = NOW();
  ELSIF NEW.status = 'in_transit' AND OLD.status IS DISTINCT FROM 'in_transit' THEN
    NEW.in_transit_at = NOW();
  ELSIF NEW.status = 'arrived' AND OLD.status IS DISTINCT FROM 'arrived' THEN
    NEW.arrived_at = NOW();
  ELSIF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at = NOW();
  ELSIF NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed' THEN
    NEW.failed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_tracking_timestamp
  BEFORE UPDATE ON delivery_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_tracking_updated_at();

-- Update delivery person stats on delivery completion
CREATE OR REPLACE FUNCTION update_delivery_person_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    UPDATE delivery_personnel
    SET 
      total_deliveries = total_deliveries + 1,
      successful_deliveries = successful_deliveries + 1
    WHERE id = NEW.delivery_person_id;
  END IF;
  
  -- Update average rating if rating is provided
  IF NEW.rating IS NOT NULL AND OLD.rating IS NULL THEN
    UPDATE delivery_personnel
    SET average_rating = (
      SELECT AVG(rating)
      FROM delivery_tracking
      WHERE delivery_person_id = NEW.delivery_person_id
      AND rating IS NOT NULL
    )
    WHERE id = NEW.delivery_person_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_person_stats
  AFTER UPDATE ON delivery_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_person_stats();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate distance between two GPS coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DECIMAL, lng1 DECIMAL,
  lat2 DECIMAL, lng2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  earth_radius CONSTANT DECIMAL := 6371; -- Earth radius in km
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlng := RADIANS(lng2 - lng1);
  
  a := SIN(dlat / 2) * SIN(dlat / 2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlng / 2) * SIN(dlng / 2);
  
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Estimate delivery time based on distance
CREATE OR REPLACE FUNCTION estimate_delivery_time(distance_km DECIMAL)
RETURNS INTEGER AS $$
DECLARE
  avg_speed_kmh CONSTANT DECIMAL := 20; -- Average speed in city
  base_time_minutes CONSTANT INTEGER := 10; -- Base preparation time
BEGIN
  RETURN base_time_minutes + CEIL((distance_km / avg_speed_kmh) * 60);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample delivery zones
INSERT INTO delivery_zones (zone_name, pincode, estimated_time_minutes, base_delivery_charge, is_serviceable) VALUES
('Zone A - City Center', '400001', 20, 30.00, true),
('Zone B - North', '400002', 30, 40.00, true),
('Zone C - South', '400003', 35, 50.00, true),
('Zone D - East', '400004', 40, 50.00, true),
('Zone E - West', '400005', 45, 60.00, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON delivery_personnel TO authenticated;
GRANT SELECT, INSERT, UPDATE ON delivery_tracking TO authenticated;
GRANT SELECT, INSERT ON delivery_location_history TO authenticated;
GRANT SELECT ON delivery_zones TO authenticated;

GRANT ALL ON delivery_personnel TO service_role;
GRANT ALL ON delivery_tracking TO service_role;
GRANT ALL ON delivery_location_history TO service_role;
GRANT ALL ON delivery_zones TO service_role;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Delivery tracking system created successfully!' as status;
SELECT COUNT(*) as zone_count FROM delivery_zones;
