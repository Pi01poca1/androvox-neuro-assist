-- Create enum for session types
CREATE TYPE public.session_type AS ENUM (
  'anamnese',
  'avaliacao_neuropsicologica',
  'tcc',
  'intervencao_neuropsicologica',
  'retorno',
  'outra'
);

-- Add session_type column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN session_type public.session_type DEFAULT 'outra';

-- Update existing sessions to have a default type
UPDATE public.sessions 
SET session_type = 'outra' 
WHERE session_type IS NULL;