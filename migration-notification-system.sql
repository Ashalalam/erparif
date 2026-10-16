-- =====================================================
-- NOTIFICATION SYSTEM SCHEMA
-- =====================================================

-- 1. Customer notification preferences
CREATE TABLE IF NOT EXISTS customer_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email preferences
  email_enabled BOOLEAN DEFAULT true,
  email_order_confirmed BOOLEAN DEFAULT true,
  email_order_processing BOOLEAN DEFAULT true,
  email_order_ready BOOLEAN DEFAULT true,
  email_order_delivered BOOLEAN DEFAULT true,
  email_order_cancelled BOOLEAN DEFAULT true,
  email_promotional BOOLEAN DEFAULT false,
  
  -- SMS preferences
  sms_enabled BOOLEAN DEFAULT true,
  sms_order_confirmed BOOLEAN DEFAULT true,
  sms_order_processing BOOLEAN DEFAULT false,
  sms_order_ready BOOLEAN DEFAULT true,
  sms_order_delivered BOOLEAN DEFAULT true,
  sms_order_cancelled BOOLEAN DEFAULT true,
  sms_promotional BOOLEAN DEFAULT false,
  
  -- Contact info
  phone_number TEXT,
  email_address TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(customer_id)
);

-- 2. Notification log (audit trail)
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES customer_orders(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms')),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'order_confirmed', 
    'order_processing', 
    'order_ready', 
    'order_delivered', 
    'order_cancelled',
    'promotional'
  )),
  
  -- Content
  recipient TEXT NOT NULL, -- email address or phone number
  subject TEXT,
  message TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  provider TEXT, -- 'resend', 'twilio', etc.
  provider_message_id TEXT,
  error_message TEXT,
  
  -- Metadata
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template details
  template_key TEXT NOT NULL UNIQUE, -- e.g., 'order_confirmed_email'
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms')),
  event_type TEXT NOT NULL,
  
  -- Content (supports placeholders like {{order_id}}, {{customer_name}})
  subject TEXT,
  body TEXT NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INSERT DEFAULT TEMPLATES
-- =====================================================

-- Email Templates
INSERT INTO notification_templates (template_key, notification_type, event_type, subject, body) VALUES
(
  'order_confirmed_email',
  'email',
  'order_confirmed',
  'Order Confirmed - Order #{{order_number}}',
  'Dear {{customer_name}},

Your order #{{order_number}} has been confirmed successfully!

Order Details:
- Total Amount: ₹{{total_amount}}
- Payment Method: {{payment_method}}
- Order Date: {{order_date}}

We will notify you once your order is being processed.

Thank you for choosing BillSprout Pharmacy!

Best regards,
BillSprout Team'
),
(
  'order_processing_email',
  'email',
  'order_processing',
  'Order Processing - Order #{{order_number}}',
  'Dear {{customer_name}},

Your order #{{order_number}} is now being processed.

Our pharmacist is preparing your medicines. You will be notified once your order is ready for pickup/delivery.

Order Details:
- Order Number: {{order_number}}
- Total Amount: ₹{{total_amount}}

Track your order: {{order_tracking_url}}

Best regards,
BillSprout Team'
),
(
  'order_ready_email',
  'email',
  'order_ready',
  'Order Ready - Order #{{order_number}}',
  'Dear {{customer_name}},

Great news! Your order #{{order_number}} is ready!

{{#if_delivery}}
Your order will be delivered shortly. Estimated delivery: {{estimated_delivery}}
{{else}}
You can pick up your order from our pharmacy.
Address: {{pharmacy_address}}
{{/if_delivery}}

Order Details:
- Order Number: {{order_number}}
- Total Amount: ₹{{total_amount}}

Best regards,
BillSprout Team'
),
(
  'order_delivered_email',
  'email',
  'order_delivered',
  'Order Delivered - Order #{{order_number}}',
  'Dear {{customer_name}},

Your order #{{order_number}} has been successfully delivered!

We hope you are satisfied with our service. If you have any questions or concerns, please contact us.

Order Details:
- Order Number: {{order_number}}
- Total Amount: ₹{{total_amount}}
- Delivered On: {{delivered_date}}

Thank you for choosing BillSprout Pharmacy!

Best regards,
BillSprout Team'
),
(
  'order_cancelled_email',
  'email',
  'order_cancelled',
  'Order Cancelled - Order #{{order_number}}',
  'Dear {{customer_name}},

Your order #{{order_number}} has been cancelled.

{{#if_refund}}
Refund of ₹{{refund_amount}} will be processed within 5-7 business days.
{{/if_refund}}

Reason: {{cancellation_reason}}

If you have any questions, please contact our support team.

Best regards,
BillSprout Team'
);

-- SMS Templates
INSERT INTO notification_templates (template_key, notification_type, event_type, subject, body) VALUES
(
  'order_confirmed_sms',
  'sms',
  'order_confirmed',
  NULL,
  'BillSprout: Order #{{order_number}} confirmed! Total: ₹{{total_amount}}. We will notify you once processing begins. Thank you!'
),
(
  'order_processing_sms',
  'sms',
  'order_processing',
  NULL,
  'BillSprout: Your order #{{order_number}} is being processed. You will be notified once ready.'
),
(
  'order_ready_sms',
  'sms',
  'order_ready',
  NULL,
  'BillSprout: Order #{{order_number}} is ready! {{delivery_or_pickup_info}}'
),
(
  'order_delivered_sms',
  'sms',
  'order_delivered',
  NULL,
  'BillSprout: Order #{{order_number}} delivered successfully! Thank you for choosing us.'
),
(
  'order_cancelled_sms',
  'sms',
  'order_cancelled',
  NULL,
  'BillSprout: Order #{{order_number}} cancelled. {{refund_info}} Contact us for assistance.'
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE customer_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Customer notification preferences policies
CREATE POLICY "Users can view own notification preferences"
  ON customer_notification_preferences FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Users can update own notification preferences"
  ON customer_notification_preferences FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Users can insert own notification preferences"
  ON customer_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Admin access to all preferences
CREATE POLICY "Admins can view all notification preferences"
  ON customer_notification_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Notification logs policies
CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = customer_id);

-- Admin/Pharmacist can view all logs
CREATE POLICY "Staff can view all notification logs"
  ON notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'pharmacist', 'staff')
    )
  );

-- System can insert logs (service role)
CREATE POLICY "System can insert notification logs"
  ON notification_logs FOR INSERT
  WITH CHECK (true);

-- Notification templates policies (read-only for users)
CREATE POLICY "Anyone can view active templates"
  ON notification_templates FOR SELECT
  USING (is_active = true);

-- Admin can manage templates
CREATE POLICY "Admins can manage templates"
  ON notification_templates FOR ALL
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

-- Update timestamp trigger for preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_preferences_timestamp
  BEFORE UPDATE ON customer_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Update timestamp trigger for templates
CREATE OR REPLACE FUNCTION update_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_templates_timestamp
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_templates_updated_at();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customer_notification_preferences (
    customer_id,
    email_address,
    phone_number
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (customer_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on user signup
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for customer_notification_preferences
CREATE INDEX IF NOT EXISTS idx_customer_notification_preferences_customer_id 
  ON customer_notification_preferences(customer_id);

-- Indexes for notification_logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_customer_id 
  ON notification_logs(customer_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_order_id 
  ON notification_logs(order_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status 
  ON notification_logs(status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at 
  ON notification_logs(created_at DESC);

-- Indexes for notification_templates
CREATE INDEX IF NOT EXISTS idx_notification_templates_event_type 
  ON notification_templates(event_type);

CREATE INDEX IF NOT EXISTS idx_notification_templates_active 
  ON notification_templates(is_active);

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON customer_notification_preferences TO authenticated;
GRANT SELECT ON notification_templates TO authenticated;
GRANT SELECT ON notification_logs TO authenticated;

-- Service role has full access
GRANT ALL ON customer_notification_preferences TO service_role;
GRANT ALL ON notification_templates TO service_role;
GRANT ALL ON notification_logs TO service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Uncomment to verify installation:
-- SELECT 'Tables created successfully!' as status;
-- SELECT COUNT(*) as template_count FROM notification_templates;
-- SELECT template_key, event_type FROM notification_templates ORDER BY event_type;
