-- ===========================================================================
-- BASE Video Studio — SETUP COMPLETO DO BANCO (rode TUDO de uma vez)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- (equivale a rodar as migrations 0001 + 0002 na ordem)
-- ===========================================================================

-- ===========================================================================
-- BASE Video Studio — schema inicial (enxuto, pool único)
-- Rode TODO este arquivo no SQL Editor do Supabase.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ----- ENUMS ---------------------------------------------------------------
do $$ begin
  create type job_status as enum ('QUEUED','PROCESSING','COMPLETED','FAILED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_type as enum ('TEXT_TO_VIDEO','IMAGE_TO_VIDEO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_kind as enum ('VIDEO','IMAGE','AUDIO');
exception when duplicate_object then null; end $$;

-- ----- MODELOS (catálogo fal — novo modelo = 1 INSERT) ---------------------
create table if not exists public.models (
  id             text primary key,            -- 'fal-ai/veo3'
  kind           media_kind not null default 'VIDEO',
  name           text not null,               -- 'Veo 3'
  description    text,
  endpoint       text not null,
  supports_image boolean not null default false,
  supports_text  boolean not null default true,
  max_images     integer not null default 1,
  durations      integer[] not null default '{5}',
  aspect_ratios  text[]    not null default '{16:9,9:16,1:1}',
  resolutions    text[]    not null default '{720p,1080p}',
  point_cost     integer   not null default 10,  -- "pontos" exibidos no botão Gerar
  is_active      boolean   not null default true,
  sort_order     integer   not null default 0,
  created_at     timestamptz not null default now()
);

-- ----- ASSETS (biblioteca de mídia do modal "Carregar mídia") --------------
create table if not exists public.assets (
  id           uuid primary key default gen_random_uuid(),
  kind         media_kind not null,
  url          text not null,
  storage_path text,
  source       text not null default 'upload', -- 'upload' | 'generation'
  job_id       uuid,                            -- se veio de uma geração
  created_by   text,                            -- nome livre (ex: admin)
  created_at   timestamptz not null default now()
);

-- ----- JOBS (a fila) -------------------------------------------------------
create table if not exists public.jobs (
  id              uuid primary key default gen_random_uuid(),
  created_by      text,
  model_id        text not null references public.models(id),
  type            job_type not null,
  status          job_status not null default 'QUEUED',

  prompt          text,
  negative_prompt text,
  input_images    jsonb not null default '[]',   -- [{url,order,storagePath}]
  config          jsonb not null default '{}',   -- {duration,aspect_ratio,resolution}

  fal_request_id  text,
  fal_endpoint    text,

  output_url      text,
  thumbnail_url   text,
  output_meta     jsonb,

  point_cost      integer not null default 0,
  error_message   text,
  retry_count     integer not null default 0,

  created_at      timestamptz not null default now(),
  started_at      timestamptz,
  completed_at    timestamptz
);

-- ----- ÍNDICES -------------------------------------------------------------
create index if not exists idx_jobs_status     on public.jobs(status);
create index if not exists idx_jobs_created_at on public.jobs(created_at desc);
create index if not exists idx_jobs_fal_req    on public.jobs(fal_request_id);
create index if not exists idx_assets_kind     on public.assets(kind);
create index if not exists idx_assets_created  on public.assets(created_at desc);

-- ===========================================================================
-- RLS — leitura pública (frontend só LÊ via anon key); escrita só via backend
-- (service_role bypassa RLS). O acesso é protegido pelo middleware/cookie.
-- ===========================================================================
alter table public.models enable row level security;
alter table public.jobs   enable row level security;
alter table public.assets enable row level security;

drop policy if exists "models_read" on public.models;
drop policy if exists "jobs_read"   on public.jobs;
drop policy if exists "assets_read" on public.assets;

create policy "models_read" on public.models for select using (true);
create policy "jobs_read"   on public.jobs   for select using (true);
create policy "assets_read" on public.assets for select using (true);

-- ===========================================================================
-- REALTIME — necessário para o useJobs() receber INSERT/UPDATE ao vivo
-- ===========================================================================
do $$ begin
  alter publication supabase_realtime add table public.jobs;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.assets;
exception when duplicate_object then null; end $$;

-- ===========================================================================
-- SEED de modelos (endpoints/custos da fal podem mudar — confirme na doc deles)
-- ===========================================================================
insert into public.models
 (id,name,description,endpoint,supports_image,supports_text,max_images,durations,aspect_ratios,resolutions,point_cost,sort_order)
values
 ('bytedance/seedance-2.0/image-to-video','Seedance 2.0','ByteDance — imagem para vídeo com áudio sincronizado. Imagem inicial (+ final opcional).','bytedance/seedance-2.0/image-to-video',true,false,2,'{5,8,10}','{auto,16:9,9:16,4:3,3:4,1:1,21:9}','{480p,720p,1080p}',60,1),
 ('bytedance/seedance-2.0/fast/image-to-video','Seedance 2.0 Fast','Versão rápida e barata do Seedance 2.0 (480p/720p). Imagem inicial (+ final).','bytedance/seedance-2.0/fast/image-to-video',true,false,2,'{5,8,10}','{auto,16:9,9:16,4:3,3:4,1:1,21:9}','{480p,720p}',48,2),
 ('bytedance/seedance-2.0/reference-to-video','Seedance 2.0 Multi','Várias fotos de referência (até 9) + áudio. Cite @Image1, @Image2… no prompt.','bytedance/seedance-2.0/reference-to-video',true,true,9,'{5,8,10}','{auto,16:9,9:16,4:3,3:4,1:1,21:9}','{480p,720p,1080p}',70,3),
 ('bytedance/seedance-2.0/fast/reference-to-video','Seedance 2.0 Fast Multi','Várias fotos (até 9) na versão rápida e barata. Cite @Image1, @Image2…','bytedance/seedance-2.0/fast/reference-to-video',true,true,9,'{5,8,10}','{auto,16:9,9:16,4:3,3:4,1:1,21:9}','{480p,720p}',55,4),
 ('fal-ai/veo3','Veo 3','Máxima qualidade + áudio (Google). Só texto.','fal-ai/veo3',false,true,0,'{4,6,8}','{16:9,9:16}','{720p,1080p}',72,5),
 ('fal-ai/veo3/image-to-video','Veo 3 Image','Veo 3 (Google) animando uma imagem, com áudio.','fal-ai/veo3/image-to-video',true,false,1,'{4,6,8}','{auto,16:9,9:16}','{720p,1080p}',72,6),
 ('fal-ai/veo3/fast','Veo 3 Fast','Rápido e barato pra prototipar (texto).','fal-ai/veo3/fast',false,true,0,'{4,6,8}','{16:9,9:16}','{720p,1080p}',36,7),
 ('fal-ai/kling-video/v3/pro/image-to-video','Kling 3.0 Pro','Kling 3.0 Pro — imagem para vídeo cinemático com áudio. Imagem inicial (+ final).','fal-ai/kling-video/v3/pro/image-to-video',true,false,2,'{5,10}','{}','{}',50,8),
 ('fal-ai/kling-video/o1/reference-to-video','Kling O1 Multi','Várias fotos de referência (até 7) para manter pessoas/objetos consistentes.','fal-ai/kling-video/o1/reference-to-video',true,true,7,'{3,5,10}','{16:9,9:16,1:1}','{}',50,9),
 ('fal-ai/kling-video/v3/pro/text-to-video','Kling 3.0','Kling 3.0 — texto para vídeo cinemático com áudio.','fal-ai/kling-video/v3/pro/text-to-video',false,true,0,'{5,10}','{16:9,9:16,1:1}','{}',56,10),
 -- EDIT
 ('fal-ai/kling-video/o1/video-to-video/edit','Kling O1 Video Edit','Edita um vídeo (troca personagem, cenário, estilo) mantendo o movimento original. Use @Image1 para referências.','fal-ai/kling-video/o1/video-to-video/edit',true,false,4,'{}','{}','{}',67,1),
 ('fal-ai/kling-video/o3/pro/video-to-video/edit','Kling 3.0 Omni Edit','Edição avançada de vídeo (O3) com áudio nativo, elementos e referências. Use @Image1, @Element1.','fal-ai/kling-video/o3/pro/video-to-video/edit',true,false,4,'{}','{}','{}',78,2),
 ('xai/grok-imagine-video/edit-video','Grok Imagine Edit','Edita vídeos por texto (xAI Grok). Troca de objetos, restyle de cena, com áudio sincronizado.','xai/grok-imagine-video/edit-video',false,false,0,'{}','{}','{auto,480p,720p}',20,3),
 -- MOTION
 ('fal-ai/kling-video/v3/pro/motion-control','Kling 3.0 Motion Control','Aplica o movimento de um vídeo de referência ao seu personagem (imagem).','fal-ai/kling-video/v3/pro/motion-control',true,false,1,'{}','{}','{}',67,1),
 ('fal-ai/kling-video/v2.6/standard/motion-control','Kling Motion Control','Transfere o movimento de um vídeo para o seu personagem (versão mais barata).','fal-ai/kling-video/v2.6/standard/motion-control',true,false,1,'{}','{}','{}',40,2)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  endpoint = excluded.endpoint,
  supports_image = excluded.supports_image,
  supports_text = excluded.supports_text,
  max_images = excluded.max_images,
  durations = excluded.durations,
  aspect_ratios = excluded.aspect_ratios,
  resolutions = excluded.resolutions,
  point_cost = excluded.point_cost,
  sort_order = excluded.sort_order;


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

