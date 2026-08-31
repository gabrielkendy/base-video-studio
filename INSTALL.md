# 🚀 Instale o seu BASE Video Studio (plug-and-play)

Gere vídeos com IA (fal.ai) na **sua própria conta**. Você sobe a sua cópia, conecta
sua chave da fal.ai e usa. **Infra grátis** (Vercel + Supabase) — você só paga o que
gerar na fal.ai, direto na sua conta.

> Leva ~10 minutos. Não precisa saber programar — é copiar, colar e clicar.

---

## O que você vai precisar (tudo grátis pra começar)
1. Conta no **GitHub** — github.com
2. Conta na **Vercel** — vercel.com (login com GitHub)
3. Conta no **Supabase** — supabase.com
4. Uma **chave da fal.ai** — fal.ai/dashboard/keys (adicione uns US$5–10 de crédito)

---

## Passo 1 — Banco de dados (Supabase)
1. Em [supabase.com](https://supabase.com) → **New project** (escolha uma senha de banco e a região mais perto).
2. Quando o projeto abrir: menu **SQL Editor** → **New query**.
3. Abra o arquivo [`supabase/setup.sql`](supabase/setup.sql) deste repositório, **copie tudo**, cole no editor e clique em **Run**.
   - Deve aparecer "Success". Isso cria as tabelas e já cadastra os modelos de IA.
4. Menu **Storage** → **New bucket** → nome **`media`** → marque **Public** → criar.
5. Menu **Settings → API** → copie 3 valores (vai usar no Passo 3):
   - **Project URL**
   - **anon public** key
   - **service_role** key (secreta)

## Passo 2 — Suba na Vercel
**Opção fácil (recomendada):** clique no botão abaixo e siga o assistente
(ele importa o repositório e já pede as variáveis):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SEU-USUARIO/SEU-REPO)

> Troque `SEU-USUARIO/SEU-REPO` pela URL do repositório (ou faça **Fork** e importe em vercel.com → New Project).

## Passo 3 — Variáveis de ambiente (na Vercel)
No projeto da Vercel → **Settings → Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | a Project URL do Passo 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | a service_role key |
| `NEXT_PUBLIC_APP_URL` | a URL do seu projeto (ex.: `https://seu-app.vercel.app`) |
| `APP_PASSWORD` | **a senha de acesso que você quiser** |
| `SESSION_SECRET` | um texto aleatório longo (assina o login) |
| `CRON_SECRET` | outro texto aleatório longo |

> **Não precisa** colocar `FAL_KEY` aqui — você vai plugar a chave pela tela de
> Configurações do app. (Se quiser, pode colocar; a UI tem prioridade.)
>
> 💡 Gera segredos fortes assim (PowerShell): `-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | %{[char]$_})`

Depois de salvar as variáveis, faça um **Redeploy** (Deployments → ⋯ → Redeploy).

## Passo 4 — Pluga sua chave da fal.ai 🔌
1. Abra o seu app (`https://seu-app.vercel.app`) → faça login com a `APP_PASSWORD`.
2. Vai aparecer um aviso amarelo no topo → clique em **Configurações** (ou no botão ⚙️).
3. Cole a sua **chave da fal.ai** e **Salvar**.
   - A chave é **criptografada** e guardada no SEU banco. Nunca aparece no navegador.
4. Pronto! Volte ao studio e gere seu primeiro vídeo. 🎬

---

## Perguntas frequentes
- **Quanto custa?** A hospedagem é grátis (Vercel Hobby + Supabase Free). Você paga
  só a geração de vídeo, direto na sua conta fal.ai (o app mostra o preço estimado antes).
- **Outras pessoas podem entrar no meu app?** Só quem tiver a sua `APP_PASSWORD`. É um
  acesso compartilhado para a sua equipe.
- **Como troco a chave depois?** Tela de Configurações → cola a nova → Salvar.
- **Meus vídeos não aparecem?** O app sincroniza sozinho a cada poucos segundos; se
  demorar, recarregue a página.

---
*Feito com ❤️ pela comunidade. Cada um usa a própria conta da fal.ai.*
