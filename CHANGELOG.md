# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato é baseado em **[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)** e este projeto segue **[Semantic Versioning](https://semver.org/lang/pt-BR/)**.

## [Unreleased]

### Added
- N/A

### Changed
- N/A

### Fixed
- N/A

## [2.0.0] - 2025-12-13

### Added
- Base do template **SmartZap v2** com Next.js (App Router), React e Tailwind.

- Dashboard (área autenticada) com visão de métricas e status do sistema.

- **Contatos**
  - CRUD completo (rotas `/api/contacts`, `/api/contacts/[id]`).
  - Importação via CSV (`/api/contacts/import`) e estatísticas (`/api/contacts/stats`).
  - Tags, notas e **campos personalizados** (rotas `/api/custom-fields`).
  - UI de **edição rápida** de contato no contexto de campanhas (`ContactQuickEditModal`).
  - Controle de cache em rotas para reduzir retorno de dados obsoletos (“flash-back”).

- **Campanhas**
  - CRUD/listagem/detalhes (`/campaigns`, `/campaigns/[id]`, `/api/campaigns`, `/api/campaigns/[id]`).
  - Detalhes com **estatísticas de mensagens** e visão de entregas/leitura/falhas.
  - Disparo em massa (`/api/campaign/dispatch`) e workflow (`/api/campaign/workflow`).
  - Reenvio e tratamento de mensagens puladas (`/api/campaigns/[id]/resend-skipped`).
  - Pré-checagem (pre-check) para contatos/variáveis antes do disparo (`/api/campaign/precheck`).

- **Templates**
  - Listagem/detalhes/criação/remoção em lote (`/api/templates`, `/api/templates/[name]`, `/api/templates/create`, `/api/templates/bulk-delete`).
  - Projetos/fábrica de templates (`/api/template-projects`, sync, itens).
  - Validação/contrato de templates do WhatsApp e utilitários de consistência.

- **IA**
  - Rotas para geração de templates com IA (`/api/ai/generate-template`, `/api/ai/generate-utility-templates`).

- **Configuração & Setup guiado**
  - Wizard e rotas de bootstrap/migração/validação de ambiente (`/setup` e `/api/setup/*`).
  - Rotas de settings para credenciais e parâmetros do app (`/api/settings/*`).
  - Gestão de contato de teste (`/api/settings/test-contact`).

- **Integrações & Operação**
  - Webhook (`/api/webhook`) e endpoints de diagnóstico (`/api/webhook/info`, `/api/health`, `/api/system`).
  - Rotas de uso/limites e alertas de conta (`/api/usage`, `/api/account/alerts`, `/api/account/limits`).
  - Integração com Vercel (info/redeploy) (`/api/vercel/*`) e config de deploy (`vercel.json`).
  - Suporte a phone numbers do WhatsApp (`/api/phone-numbers/*`).

- Banco de dados **Supabase** (Postgres) com schema/migration consolidada e índices para:
  - `campaigns`, `contacts`, `campaign_contacts`, `templates`, `settings`, `account_alerts`, `template_projects`, `template_project_items`, `custom_field_definitions`.
  - Estratégia de “snapshot” de contato por campanha (ex.: email/custom_fields no momento da campanha).

- Funções RPC no Postgres:
  - `get_dashboard_stats()` para estatísticas agregadas.
  - `increment_campaign_stat(campaign_id_input, field)` para incremento atômico de contadores.

- Realtime habilitado via `supabase_realtime` (publication) para entidades principais (campanhas, contatos, itens de campanha, alertas, campos personalizados).

- Autenticação com **multi-sessão** e gestão de tokens de sessão.

- Qualidade/DevEx
  - Lint com **ESLint** (Next.js + TypeScript).
  - Testes com **Vitest** (configuração inicial para unit/integration).
  - Scripts/utilitários diversos em `scripts/` (auditoria/checagens/migrações auxiliares) e relatórios em `test-results/`.

### Changed
- Atualização do `@upstash/workflow` para `0.3.0-rc` e ajuste de `overrides` para `jsondiffpatch`.
- Remoção de configuração de headers CORS do `next.config.ts` (centralizando políticas na borda/infra quando aplicável).
- Melhoria de cache/controle de staleness em rotas de contatos (cabeçalhos) para reduzir “flash-back” de dados.
- Ajustes na visualização de campanha para considerar status **SKIPPED**.
- Refactors de organização/legibilidade e ajustes de fluxo em rotas (ex.: atualização de contatos e campos personalizados).
- Campanhas: atualização de lógica para **anexar `campaign_id`** em updates relacionados a contatos e **filtrar updates inválidos**.

### Fixed
- Correções de tipos/valores nulos para timestamps de campanhas (ex.: `completedAt` indefinido → `null`).
- Correções no pre-check (`precheckContactForTemplate`) para diagnosticar valores faltantes com mais precisão.
- Melhorias no tratamento de erro do `contactService` em operações de leitura.
- Correção de import de rotas para o tipo correto.

### Removed
- Remoção de dependência do `@google/genai` do `package.json`.
- Remoção de alguns testes/unitários e artefatos auxiliares (mantendo a base do template mais enxuta).
- Remoção do diretório `.tmp/` (conteúdos de referência, specs e testes avançados que não fazem parte do “core” do template educacional).

### Docs
- Atualizações no guia de configuração (`docs/GUIA_CONFIGURACAO.md`) com detalhes adicionais de setup/diagnóstico.

### Engineering notes (histórico por commit)

> Referência explícita dos commits que compõem este release, do mais antigo ao mais recente.

- 2025-12-12 `8505c0f`: first commit (base do app: `app/`, `components/`, `hooks/`, `lib/`, `services/`, `supabase/`, configs de deploy).
- 2025-12-12 `fe463d0`: chore: update `@upstash/workflow` para `0.3.0-rc` e `overrides`.
- 2025-12-12 `c57e94e`: remove dependência `@google/genai`.
- 2025-12-12 `4248fe0`: configuração do ESLint e ajustes correlatos.
- 2025-12-12 `05f24b6`: refactor geral de estrutura/legibilidade.
- 2025-12-13 `76b5375`: adiciona configuração inicial do Vitest (unit/integration) e arquivos auxiliares (posteriormente enxugados).
- 2025-12-13 `3c6520f`: fix timestamps nulos (`completedAt`) e tipos.
- 2025-12-13 `7aa3aa1`: melhora rastreamento de parâmetros no precheck de templates.
- 2025-12-13 `a4150d8`: adiciona pre-check em campanhas/contatos/variáveis e melhorias em rotas de setup.
- 2025-12-13 `14607c3`: modal de quick edit + humanização de mensagens do precheck + docs.
- 2025-12-13 `4d082d3`: feat(auth) multi-sessão + ajustes em serviços/docs.
- 2025-12-13 `d8b8dfd`: remove CORS headers do `next.config.ts`.
- 2025-12-13 `a64695b`: fix de import/tipos de rotas.
- 2025-12-13 `dfc196e`: refactor em custom-fields e lógica de update de contatos.
- 2025-12-13 `c9232ef`: stats/real em detalhes da campanha.
- 2025-12-13 `64234dd`: suporte a email em contatos.
- 2025-12-13 `a540152`: refactor e limpeza de artefatos.
- 2025-12-13 `4cf7629`: melhora foco/edição rápida e múltiplos custom fields.
- 2025-12-13 `26d705c`: remove testes e grande volume de conteúdo de referência (.tmp).
- 2025-12-13 `6c0f5e2`: considera status SKIPPED em exibição/reenvio.
- 2025-12-13 `22e04cd`: melhora cache headers e hooks/serviços de contatos.
- 2025-12-13 `613baf7`: melhorias em realtime/alertas/cache/validação e ajustes no schema.
- 2025-12-13 `885be45`: campanhas: adiciona `campaign_id` em updates e filtra updates inválidos.

[Unreleased]: https://github.com/thaleslaray/smartzap/compare/885be45...HEAD
[2.0.0]: https://github.com/thaleslaray/smartzap/compare/8505c0f...885be45
