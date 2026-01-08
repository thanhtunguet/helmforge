ALTER TABLE public.services
ADD COLUMN use_custom_ports BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.services
ADD COLUMN custom_ports JSONB NOT NULL DEFAULT '[]';
