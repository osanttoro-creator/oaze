# OAZE 2 — Backend

Status: **etapa 2 (não implementado no v1)** · 28/09/2026

O v1 roda sem servidor: dados no aparelho, Coco no aparelho. Esta é a direção para ligar conta, sincronização e Coco com IA, reaproveitando o Supabase do OAZE 1.

## O que já existe no Supabase do OAZE 1 (verificado no repositório)

- Tabelas normalizadas: `workspaces`, `workspace_members`, `accounts`, `credit_cards`, `categories`, `transactions`, `card_invoices`, `budgets`, `goals`, `investments`, `profiles`, `user_settings`, planos/assinaturas, `ai_rate_limits`, `ai_usage`, `privacy_acceptances`.
- RLS nas migrações `_rls.sql`; nenhuma chave de serviço no cliente.
- Edge Functions: `oaze-assistant` (IA), `oaze-conta` (exclusão), `oaze-contato`, `oaze-pagamento`, webhooks Stripe e Asaas.
- Problema aberto do OAZE 1: dois modelos convivendo (documento JSON `dados` e tabelas normalizadas).

## Decisão proposta

O OAZE 2 usa **só as tabelas normalizadas**. O documento `dados` vira apenas fonte de migração. Isso fecha a pendência "fonte dupla" que bloqueava o Open Finance.

## O que falta criar

| Peça | Para quê |
|---|---|
| valores em centavos (`bigint`) nas tabelas novas ou colunas novas | o v2 é todo em centavos |
| `transactions.method` com os 9 valores do v2 | o v1 só distinguia cartão/conta |
| `coco_memory` (workspace, título, detalhe, origem, criado_em, apagado_em) | memória auditável e esquecível |
| `coco_decisions` | o que foi aceito/dispensado em "Agora", entre aparelhos |
| `devices` (sessão, plataforma, último uso) | "sair dos outros aparelhos" |
| `notification_prefs` | privacidade do aviso, horários |
| fila de sincronização no cliente (portar `fila.js`) | offline primeiro, idempotente por id |

Cada migração com RLS e teste de isolamento por workspace, como no OAZE 1.

## Coco com IA

Mantém o desenho do OAZE 1: o cliente manda pedido + agregados à `oaze-assistant`; modelo, prompt e limites ficam no servidor. Ferramentas de proposta (`propor_lancamento` etc.) devolvem rascunho; gravar continua exigindo toque. Consentimento (versão, data, revogação) antes do primeiro envio. Nesta versão nada sai do aparelho.

## Fora desta etapa

Open Finance — decidido em 28/09/2026: atualização futura.
