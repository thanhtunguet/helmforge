-- Add missing columns to tls_secrets table
ALTER TABLE public.tls_secrets
ADD COLUMN IF NOT EXISTS cert text,
ADD COLUMN IF NOT EXISTS private_key text,
ADD COLUMN IF NOT EXISTS not_before timestamp with time zone,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Add missing tls column to ingresses table (JSONB for TLS configuration)
ALTER TABLE public.ingresses
ADD COLUMN IF NOT EXISTS tls jsonb DEFAULT '[]'::jsonb;