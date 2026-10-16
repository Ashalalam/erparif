-- Create storage bucket for prescription uploads
-- Run this in Supabase SQL Editor

-- Create the prescriptions bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the prescriptions bucket
-- Allow authenticated users to upload prescriptions
CREATE POLICY "Authenticated users can upload prescriptions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'prescriptions');

-- Allow users to view their own uploaded prescriptions
CREATE POLICY "Users can view prescriptions"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'prescriptions');

-- Allow admins and pharmacists to view all prescriptions
CREATE POLICY "Staff can view all prescriptions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'prescriptions' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'pharmacist')
  )
);

-- Allow users to delete their own prescriptions (within 24 hours)
CREATE POLICY "Users can delete their recent prescriptions"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'prescriptions' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  created_at > NOW() - INTERVAL '24 hours'
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Prescriptions storage bucket created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Bucket Details:';
  RAISE NOTICE '  - Name: prescriptions';
  RAISE NOTICE '  - Public: Yes';
  RAISE NOTICE '  - Path: prescriptions/';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies:';
  RAISE NOTICE '  - Authenticated users can upload';
  RAISE NOTICE '  - Users can view prescriptions';
  RAISE NOTICE '  - Staff can view all prescriptions';
  RAISE NOTICE '  - Users can delete recent uploads';
END $$;
