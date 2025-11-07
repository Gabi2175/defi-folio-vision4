-- Add is_active column to accounts table to allow users to temporarily exclude accounts from calculations
ALTER TABLE accounts ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;