-- Add readme column to templates table
ALTER TABLE public.templates ADD COLUMN readme text;

-- Add release_notes column to chart_versions table
ALTER TABLE public.chart_versions ADD COLUMN release_notes text;