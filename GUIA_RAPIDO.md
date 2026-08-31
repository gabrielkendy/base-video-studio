# ⚡ Guia Rápido — BASE Video Studio em 5 passos

> Versão TL;DR. Quer o passo a passo detalhado? Veja [INSTALL.md](INSTALL.md).
> Tempo: ~10 min. Hospedagem grátis. Você só paga o que gerar na fal.ai.

---

### 1. Supabase (banco) — 3 min
- [supabase.com](https://supabase.com) → **New project**.
- **SQL Editor → New query** → cole TUDO de [`supabase/setup.sql`](supabase/setup.sql) → **Run**.
- **Storage → New bucket** → nome `media` → marque **Public**.
- **Settings → API** → guarde: **Project URL**, **anon key**, **service_role key**.

### 2. Suba o app — 1 clique
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gabrielkendy/base-video-studio)

### 3. Variáveis na Vercel — 2 min
Em **Settings → Environment Variables**, cole:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (passo 1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `NEXT_PUBLIC_APP_URL` | a URL do seu app (`https://...vercel.app`) |
| `APP_PASSWORD` | a senha de acesso que VOCÊ escolher |
| `SESSION_SECRET` | texto aleatório longo |
| `CRON_SECRET` | outro texto aleatório longo |

> 🔑 `FAL_KEY` **não** vai aqui — você pluga a chave dentro do app (passo 5).
> Gerar segredo forte (PowerShell): `-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | %{[char]$_})`

Salvou? → **Deployments → ⋯ → Redeploy**.

### 4. Entre — 30 seg
Abra `https://seu-app.vercel.app` → login com a sua `APP_PASSWORD`.

### 5. Pluga sua chave da fal.ai — 30 seg
Aviso amarelo no topo → **⚙️ Configurações** → cole a chave da [fal.ai](https://fal.ai/dashboard/keys) → **Salvar**.
A chave fica **criptografada no seu banco**, nunca aparece no navegador. 🎬

---

**Travou?** → [INSTALL.md](INSTALL.md) tem o passo a passo completo + FAQ.
