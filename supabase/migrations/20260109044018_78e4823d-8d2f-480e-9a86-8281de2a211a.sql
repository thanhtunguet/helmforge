-- Add new fields to services table for external services and consolidated features
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS replicas integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS use_daemon_set boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS image text;