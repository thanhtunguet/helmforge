ALTER TABLE public.ingresses
ADD COLUMN IF NOT EXISTS tls JSONB NOT NULL DEFAULT '[]';

UPDATE public.ingresses
SET tls = jsonb_build_array(
  jsonb_build_object(
    'secretName', tls_secret_name,
    'hosts', COALESCE(
      (
        SELECT jsonb_agg(host ->> 'hostname')
        FROM jsonb_array_elements(rules) AS host
        WHERE host ? 'hostname'
      ),
      CASE
        WHEN default_host IS NOT NULL THEN jsonb_build_array(default_host)
        ELSE '[]'::jsonb
      END
    )
  )
)
WHERE tls_secret_name IS NOT NULL
  AND tls_enabled = true
  AND (tls IS NULL OR tls = '[]'::jsonb);
