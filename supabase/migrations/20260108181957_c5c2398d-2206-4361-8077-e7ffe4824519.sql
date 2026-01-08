-- Create template_shares table for sharing private templates with specific users
CREATE TABLE public.template_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  shared_by_user_id uuid NOT NULL,
  UNIQUE(template_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.template_shares ENABLE ROW LEVEL SECURITY;

-- Template owners can manage shares for their templates
CREATE POLICY "Template owners can manage shares"
ON public.template_shares
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.templates
    WHERE templates.id = template_shares.template_id
    AND templates.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.templates
    WHERE templates.id = template_shares.template_id
    AND templates.user_id = auth.uid()
  )
);

-- Users can view shares where they are the recipient
CREATE POLICY "Users can view their received shares"
ON public.template_shares
FOR SELECT
USING (shared_with_user_id = auth.uid());

-- Update templates RLS to allow shared users to view/edit
DROP POLICY IF EXISTS "Users can view own or public templates" ON public.templates;

CREATE POLICY "Users can view own, public, or shared templates"
ON public.templates
FOR SELECT
USING (
  auth.uid() = user_id 
  OR visibility = 'public'::template_visibility
  OR EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = templates.id
    AND template_shares.shared_with_user_id = auth.uid()
  )
);

-- Allow shared users with edit permission to update templates
CREATE POLICY "Shared users with edit permission can update"
ON public.templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = templates.id
    AND template_shares.shared_with_user_id = auth.uid()
    AND template_shares.permission = 'edit'
  )
);

-- Update related tables RLS to allow shared users access

-- Services: Allow shared users to view
CREATE POLICY "Shared users can view services"
ON public.services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = services.template_id
    AND template_shares.shared_with_user_id = auth.uid()
  )
);

-- Services: Allow shared users with edit permission to manage
CREATE POLICY "Shared users with edit can manage services"
ON public.services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = services.template_id
    AND template_shares.shared_with_user_id = auth.uid()
    AND template_shares.permission = 'edit'
  )
);

-- ConfigMaps: Allow shared users to view
CREATE POLICY "Shared users can view config_maps"
ON public.config_maps
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = config_maps.template_id
    AND template_shares.shared_with_user_id = auth.uid()
  )
);

-- ConfigMaps: Allow shared users with edit permission to manage
CREATE POLICY "Shared users with edit can manage config_maps"
ON public.config_maps
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = config_maps.template_id
    AND template_shares.shared_with_user_id = auth.uid()
    AND template_shares.permission = 'edit'
  )
);

-- TLS Secrets: Allow shared users to view
CREATE POLICY "Shared users can view tls_secrets"
ON public.tls_secrets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = tls_secrets.template_id
    AND template_shares.shared_with_user_id = auth.uid()
  )
);

-- TLS Secrets: Allow shared users with edit permission to manage
CREATE POLICY "Shared users with edit can manage tls_secrets"
ON public.tls_secrets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = tls_secrets.template_id
    AND template_shares.shared_with_user_id = auth.uid()
    AND template_shares.permission = 'edit'
  )
);

-- Opaque Secrets: Allow shared users to view
CREATE POLICY "Shared users can view opaque_secrets"
ON public.opaque_secrets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = opaque_secrets.template_id
    AND template_shares.shared_with_user_id = auth.uid()
  )
);

-- Opaque Secrets: Allow shared users with edit permission to manage
CREATE POLICY "Shared users with edit can manage opaque_secrets"
ON public.opaque_secrets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = opaque_secrets.template_id
    AND template_shares.shared_with_user_id = auth.uid()
    AND template_shares.permission = 'edit'
  )
);

-- Ingresses: Allow shared users to view
CREATE POLICY "Shared users can view ingresses"
ON public.ingresses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = ingresses.template_id
    AND template_shares.shared_with_user_id = auth.uid()
  )
);

-- Ingresses: Allow shared users with edit permission to manage
CREATE POLICY "Shared users with edit can manage ingresses"
ON public.ingresses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = ingresses.template_id
    AND template_shares.shared_with_user_id = auth.uid()
    AND template_shares.permission = 'edit'
  )
);

-- Chart Versions: Allow shared users to view
CREATE POLICY "Shared users can view chart_versions"
ON public.chart_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = chart_versions.template_id
    AND template_shares.shared_with_user_id = auth.uid()
  )
);

-- Chart Versions: Allow shared users with edit permission to manage
CREATE POLICY "Shared users with edit can manage chart_versions"
ON public.chart_versions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.template_shares
    WHERE template_shares.template_id = chart_versions.template_id
    AND template_shares.shared_with_user_id = auth.uid()
    AND template_shares.permission = 'edit'
  )
);

-- Add index for performance
CREATE INDEX idx_template_shares_shared_with ON public.template_shares(shared_with_user_id);
CREATE INDEX idx_template_shares_template ON public.template_shares(template_id);

-- Update profiles to allow viewing other users' profiles (for share selection)
CREATE POLICY "Users can view all profiles for sharing"
ON public.profiles
FOR SELECT
USING (true);