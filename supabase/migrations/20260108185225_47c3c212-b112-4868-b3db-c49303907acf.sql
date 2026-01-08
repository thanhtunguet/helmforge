-- Drop the overly permissive policy that exposes all user data
DROP POLICY IF EXISTS "Users can view all profiles for sharing" ON public.profiles;

-- Create a more restrictive policy: only view profiles of users you have a sharing relationship with
CREATE POLICY "Users can view profiles of sharing partners"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.template_shares ts
    WHERE (ts.shared_by_user_id = auth.uid() AND ts.shared_with_user_id = profiles.id)
       OR (ts.shared_with_user_id = auth.uid() AND ts.shared_by_user_id = profiles.id)
  )
);

-- Create a secure function to find users by email for sharing (returns minimal info)
CREATE OR REPLACE FUNCTION public.find_user_for_sharing(search_email text)
RETURNS TABLE(id uuid, email text, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(search_email)
  LIMIT 1;
$$;