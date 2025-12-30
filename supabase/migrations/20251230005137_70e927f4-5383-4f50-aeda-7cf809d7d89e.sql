-- Create an enum for template visibility
CREATE TYPE public.template_visibility AS ENUM ('private', 'public');

-- Add visibility column to templates table with default 'private'
ALTER TABLE public.templates 
ADD COLUMN visibility public.template_visibility NOT NULL DEFAULT 'private';

-- Update RLS policies to allow viewing public templates
-- First drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own templates" ON public.templates;

-- Create new SELECT policy that allows viewing own templates OR public templates
CREATE POLICY "Users can view own or public templates"
ON public.templates
FOR SELECT
USING (
  auth.uid() = user_id 
  OR visibility = 'public'
);

-- The existing INSERT, UPDATE, DELETE policies remain unchanged (only owner can modify)