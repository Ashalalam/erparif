-- =====================================================
-- CREATE STORAGE BUCKET FOR INVOICES & DOCUMENTS
-- =====================================================
-- This creates a public bucket for storing PDF invoices and other documents
-- Run this in Supabase SQL Editor

-- Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,  -- Public bucket so invoices can be downloaded
  10485760,  -- 10MB max file size
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their invoices
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'invoices'
);

-- Allow public read access to documents
CREATE POLICY "Anyone can view documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Allow users to delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Verification
SELECT 'Documents bucket created successfully!' as status;
