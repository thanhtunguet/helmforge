-- Add is_admin column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add banned_until column to track user ban status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'banned_until'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN banned_until TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index on is_admin for faster admin checks
DROP INDEX IF EXISTS idx_profiles_is_admin;
CREATE INDEX idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Drop ALL existing RLS policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile or admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile or admins can update any" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Simpler approach: Allow authenticated users to view all profiles
-- This is acceptable since profile information isn't highly sensitive
-- and admins need to see all users
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Only allow users to update their own profile
-- Admin updates will be handled via Edge Function with service role
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Allow users to insert their own profile (for signup)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
