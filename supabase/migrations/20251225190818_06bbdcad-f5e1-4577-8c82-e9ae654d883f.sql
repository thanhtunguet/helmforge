-- Create templates table to store chart templates
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  shared_port INTEGER NOT NULL DEFAULT 80,
  registry_url TEXT,
  registry_project TEXT,
  registry_secret JSONB,
  enable_nginx_gateway BOOLEAN NOT NULL DEFAULT false,
  enable_redis BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Users can view their own templates" ON public.templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" ON public.templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.templates
  FOR DELETE USING (auth.uid() = user_id);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  routes JSONB NOT NULL DEFAULT '[]',
  env_vars JSONB NOT NULL DEFAULT '[]',
  health_check_enabled BOOLEAN NOT NULL DEFAULT false,
  liveness_path TEXT DEFAULT '/health',
  readiness_path TEXT DEFAULT '/ready',
  config_map_env_sources JSONB NOT NULL DEFAULT '[]',
  secret_env_sources JSONB NOT NULL DEFAULT '[]',
  use_stateful_set BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage services via template ownership" ON public.services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.templates WHERE id = template_id AND user_id = auth.uid())
  );

-- Create config_maps table
CREATE TABLE public.config_maps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  keys JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.config_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage config_maps via template ownership" ON public.config_maps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.templates WHERE id = template_id AND user_id = auth.uid())
  );

-- Create tls_secrets table
CREATE TABLE public.tls_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tls_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage tls_secrets via template ownership" ON public.tls_secrets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.templates WHERE id = template_id AND user_id = auth.uid())
  );

-- Create opaque_secrets table
CREATE TABLE public.opaque_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  keys JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.opaque_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage opaque_secrets via template ownership" ON public.opaque_secrets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.templates WHERE id = template_id AND user_id = auth.uid())
  );

-- Create ingresses table
CREATE TABLE public.ingresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'nginx-gateway',
  rules JSONB NOT NULL DEFAULT '[]',
  default_host TEXT,
  tls_enabled BOOLEAN NOT NULL DEFAULT false,
  tls_secret_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ingresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage ingresses via template ownership" ON public.ingresses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.templates WHERE id = template_id AND user_id = auth.uid())
  );

-- Create chart_versions table
CREATE TABLE public.chart_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  app_version TEXT,
  values JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chart_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage chart_versions via template ownership" ON public.chart_versions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.templates WHERE id = template_id AND user_id = auth.uid())
  );

-- Create service_accounts table for Helm registry access
CREATE TABLE public.service_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.service_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own service accounts" ON public.service_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own service accounts" ON public.service_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service accounts" ON public.service_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service accounts" ON public.service_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Create service_account_template_access table
CREATE TABLE public.service_account_template_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_account_id UUID NOT NULL REFERENCES public.service_accounts(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_account_id, template_id)
);

ALTER TABLE public.service_account_template_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage template access via service account ownership" ON public.service_account_template_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.service_accounts WHERE id = service_account_id AND user_id = auth.uid())
  );

-- Create updated_at trigger for templates
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate service account API key (for edge functions)
CREATE OR REPLACE FUNCTION public.validate_service_account_key(p_api_key TEXT)
RETURNS TABLE (
  service_account_id UUID,
  user_id UUID,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  WHERE sa.api_key_prefix = v_prefix
    AND sa.api_key_hash = v_hash
    AND sa.is_active = true;
END;
$$;

-- Function to check if service account has access to template
CREATE OR REPLACE FUNCTION public.check_template_access(p_service_account_id UUID, p_template_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.service_account_template_access
    WHERE service_account_id = p_service_account_id
      AND template_id = p_template_id
  )
$$;

-- Function to update last_used_at for service account
CREATE OR REPLACE FUNCTION public.update_service_account_last_used(p_service_account_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.service_accounts
  SET last_used_at = now()
  WHERE id = p_service_account_id
$$;