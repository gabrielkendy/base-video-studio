# 🎬 BASE Video Studio — Seu Próprio Editor de Vídeo com IA

Editor de vídeo com IA **self-hosted**: você conecta **direto com o fornecedor** (fal.ai) e paga só o custo real da geração. Sem assinatura de plataforma, sem margem escondida.

> **Aula completa:** "Tenha Seu Próprio Higsfield" no canal — material em https://materiais-aulas.vercel.app/seu-higsfield

---

## ✨ O que faz

- Sobe o vídeo, descreve a edição e o sistema gera
- Chave do fornecedor plugada pela interface, **criptografada no banco** (nunca no código)
- Deploy grátis na Vercel · Banco grátis no Supabase

## 🧱 Stack

Next.js + Supabase + fal.ai

## 🚀 Instalação (4 passos)

1. **Supabase:** crie o projeto → rode `supabase/setup.sql` → crie o bucket `media` (público) → copie as chaves da API
2. **Vercel:** importe este repositório → deploy automático (grátis)
3. **Variáveis:** configure as env vars (modelo em `.env.example`)
4. **Chave do fornecedor:** abra o app → Configurações → cole a chave da fal.ai → salve

Passo a passo completo: **INSTALL.md**

## ⚠️ Regras de ouro

- `SUPABASE_SERVICE_ROLE_KEY` só no servidor (nunca no client)
- Troque a `APP_PASSWORD` antes de publicar
- Chaves nunca em commit

## 🔗 Links

- Aula: material do aluno → https://materiais-aulas.vercel.app/seu-higsfield
- Fornecedor: https://fal.ai/dashboard/keys
