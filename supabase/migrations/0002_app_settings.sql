-- ===========================================================================
-- BASE Video Studio — tabela de configurações do app (BYOK)
-- Guarda a chave da fal.ai (CRIPTOGRAFADA) configurada pela UI.
-- ⚠️ Diferente das outras tabelas, esta NÃO tem leitura pública: só o backend
-- (service_role) lê. A chave nunca é exposta ao navegador.
-- ===========================================================================

create table if not exists public.app_settings (
  id                 text primary key default 'singleton',
  fal_key_encrypted  text,           -- chave da fal.ai criptografada (AES-GCM)
  updated_by         text,
  updated_at         timestamptz not null default now(),
  constraint app_settings_singleton check (id = 'singleton')
);

alter table public.app_settings enable row level security;

-- Sem policy de SELECT/INSERT/UPDATE para anon: ninguém lê/escreve via anon key.
-- O backend usa service_role (bypassa RLS). Garante que a chave fique secreta.
revoke all on public.app_settings from anon, authenticated;

-- Linha singleton inicial (vazia)
insert into public.app_settings (id) values ('singleton')
on conflict (id) do nothing;
