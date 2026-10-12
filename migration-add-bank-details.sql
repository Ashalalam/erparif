-- Add bank details fields to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_branch TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;

-- Update comment
COMMENT ON COLUMN settings.bank_name IS 'Bank name for payment details';
COMMENT ON COLUMN settings.bank_branch IS 'Bank branch name';
COMMENT ON COLUMN settings.bank_account IS 'Bank account number';
COMMENT ON COLUMN settings.bank_ifsc IS 'Bank IFSC code';
