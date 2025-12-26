-- Add auth_type and basic auth credentials to service_accounts table
ALTER TABLE public.service_accounts 
ADD COLUMN auth_type text NOT NULL DEFAULT 'bearer' CHECK (auth_type IN ('bearer', 'basic')),
ADD COLUMN basic_username text,
ADD COLUMN basic_password_hash text;

-- Create index on basic_username for faster lookups
CREATE INDEX idx_service_accounts_basic_username ON public.service_accounts(basic_username) WHERE auth_type = 'basic';

-- Update the validate function to handle both auth types
CREATE OR REPLACE FUNCTION public.validate_service_account_key(p_api_key text)
RETURNS TABLE(service_account_id uuid, user_id uuid, is_valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix TEXT;
  v_hash TEXT;
BEGIN
  -- Extract prefix (first 8 chars)
  v_prefix := LEFT(p_api_key, 8);
  -- Hash the full key
  v_hash := encode(sha256(p_api_key::bytea), 'hex');
  
  RETURN QUERY
  SELECT 
    sa.id as service_account_id,
    sa.user_id,
    true as is_valid
  FROM public.service_accounts sa
  WHERE sa.auth_type = 'bearer'
    AND sa.api_key_prefix = v_prefix
    AND sa.api_key_hash = v_hash
    AND sa.is_active = true;
END;
$function$;

-- Create a new function to validate basic auth
CREATE OR REPLACE FUNCTION public.validate_service_account_basic(p_username text, p_password text)
RETURNS TABLE(service_account_id uuid, user_id uuid, is_valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_password_hash TEXT;
BEGIN
  -- Hash the password
  v_password_hash := encode(sha256(p_password::bytea), 'hex');
  
  RETURN QUERY
  SELECT 
    sa.id as service_account_id,
    sa.user_id,
    true as is_valid
  FROM public.service_accounts sa
  WHERE sa.auth_type = 'basic'
    AND sa.basic_username = p_username
    AND sa.basic_password_hash = v_password_hash
    AND sa.is_active = true;
END;
$function$;