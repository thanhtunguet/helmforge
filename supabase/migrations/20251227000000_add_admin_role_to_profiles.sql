-- Add is_admin column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Add banned_until column to track user ban status
ALTER TABLE public.profiles
ADD COLUMN banned_until TIMESTAMP WITH TIME ZONE;

-- Create index on is_admin for faster admin checks
CREATE INDEX idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Create function to check if user is admin (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND is_admin = true
  );
END;
$$;

-- Update RLS policies to allow admins to view all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile or admins can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR 
  public.is_user_admin(auth.uid())
);

-- Allow admins to update any profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile or admins can update any"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id 
  OR 
  public.is_user_admin(auth.uid())
);
