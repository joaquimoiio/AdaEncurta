# ADA Encurta

Encurtador de links da **ADA Nutracêuticos** com rastreamento de cliques, campanhas com UTM, QR Code, dashboard e relatórios em CSV.

Monólito em **Next.js 16 (App Router) + TypeScript + PostgreSQL/Prisma + Redis + Tailwind 4 + shadcn/ui + Recharts + Zod**, gerenciado com **pnpm** e executado localmente via **Docker Compose**.

## Executando localmente

Pré-requisitos: Node 22+, pnpm 11+, Docker.

```bash
cp .env.example .env          # ajuste se necessário
pnpm install
pnpm db:up                    # sobe PostgreSQL (porta 5434) e Redis (porta 6380)
pnpm db:migrate               # aplica as migrations
pnpm dev                      # http://localhost:3000  (painel em /admin)
```

Sem seed: o sistema inicia vazio. Crie o primeiro link em **/admin/links/novo**.

### Scripts

| Script            | O que faz                                              |
| ----------------- | ------------------------------------------------------ |
| `pnpm dev`        | Servidor de desenvolvimento                            |
| `pnpm build`      | `prisma generate` + `next build`                       |
| `pnpm start`      | Servidor de produção                                   |
| `pnpm test`       | Testes (unitários + integração, usam o Postgres/Redis do compose) |
| `pnpm typecheck`  | Tipagem (`next typegen` + `tsc`)                       |
| `pnpm lint`       | ESLint                                                 |
| `pnpm db:up/down` | Sobe/derruba Postgres e Redis                          |
| `pnpm db:migrate` | Cria/aplica migrations em desenvolvimento              |
| `pnpm db:deploy`  | Aplica migrations em produção                          |
| `pnpm db:reset`   | Recria o banco do zero (apaga tudo)                    |
| `pnpm db:studio`  | Prisma Studio                                          |

### Tudo em containers (opcional)

```bash
docker compose --profile app up --build
```

Sobe Postgres, Redis e a aplicação (`docker/Dockerfile`, imagem standalone). O entrypoint roda `prisma migrate deploy` antes de iniciar.

## Como funciona

```
GET /{codigo}
  ├─ rate limit por IP (Redis; fallback em memória)
  ├─ resolve o link no Redis (link:{codigo}) → fallback PostgreSQL → popula o cache
  ├─ responde 302 para a URL original (+ UTMs da campanha/link/requisição)
  └─ after(): registra o clique no PostgreSQL sem atrasar o redirect
```

- **Painel**: `/admin` (dashboard), `/admin/links`, `/admin/campanhas`, `/admin/relatorios`.
- **API**: `/api/links`, `/api/links/:id`, `/api/links/:id/stats`, `/api/links/:id/qrcode`, `/api/campaigns`, `/api/dashboard`, `/api/reports/export`, `/api/health`.
- Links inativos/expirados/inexistentes redirecionam para `/link-indisponivel`. Ao desativar um link, o painel abre um popup para personalizar o **título** e a **mensagem** exibidos aos visitantes (em branco = texto padrão).
- O cache do redirect é invalidado ao editar/excluir um link ou alterar a campanha dele.

### MCP (Claude Code / Claude Desktop)

`mcp/` é um servidor MCP (stdio) que usa **somente a API HTTP** do app. Com o app rodando (`pnpm dev`):

```bash
claude mcp add ada-encurta -e ADA_API_URL=http://localhost:3000 -- pnpm --dir /caminho/para/AdaEncurta mcp
```

Tools: `list/get/create/update_campaign`, `list/get/create/update_link`, `create_links_for_channels` (um link por canal com UTMs próprios), `deactivate_link` (com título/mensagem personalizados), `activate_link`, `get_link_qrcode`, `get_link_stats`, `get_campaign_report`, `get_dashboard`, `export_report` (CSV).
**Interruptor:** o MCP só funciona com `MCP_ENABLED=true` no `.env` do app (padrão: `false`). Desligado, a API responde 403 a toda requisição do MCP (identificada pelo header `X-Ada-Client: mcp`) e todas as tools retornam erro. Reinicie o app após mudar o valor.
Os valores de UTM são normalizados (minúsculas, sem acento, hífens) para os relatórios não fragmentarem. A API não tem autenticação; não exponha o app publicamente sem uma camada de proteção.

### Estrutura

```
prisma/           schema, migrations
src/app/          rotas (App Router): [code] redirect, admin/*, api/*
src/server/       regras de negócio: links, campanhas, redirect, stats, reports, qrcode, cache
src/lib/          infraestrutura: env (Zod), prisma, redis, rate limit, url, ua, referer, geo, audit
src/lib/validators/  schemas Zod da API
src/components/   UI (shadcn/ui em components/ui)
tests/            unit/ e integration/ (Vitest)
```

## Dados e LGPD

Tabelas: `campaigns`, `links`, `clicks`, `audit_logs` (índices em `clicks(linkId, createdAt)`, `clicks(createdAt)`, país, dispositivo, origem, etc.).

Por clique guardamos apenas: data/hora, tipo de dispositivo, navegador e SO (nome + versão principal), **host** do referer e sua classificação, país/estado/cidade aproximados, UTMs e um `visitorHash` (HMAC diário de IP+UA, irreversível e rotativo) para contar visitantes únicos. **IP e user-agent brutos não são armazenados.** Geolocalização usa cabeçalhos do CDN quando existirem ou a base offline `geoip-lite` (desligável com `GEOIP_ENABLED=false`).

## Segurança

- Validação de entrada com Zod em todas as rotas (URLs apenas http/https, sem credenciais, sem hosts internos, sem apontar para o próprio encurtador; opcionalmente restritas por `ALLOWED_DESTINATION_HOSTS`).
- Códigos reservados (`admin`, `api`, `_next`, …) não podem virar links.
- Rate limiting no redirect e na API (`RATE_LIMIT_*`).
- Cabeçalhos de segurança (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`), `noindex` nas respostas do redirect.
- Exclusão lógica de links preserva o histórico; toda mutação gera registro em `audit_logs`.
- Segredos apenas via `.env` (`HASH_SECRET`, `DATABASE_URL`, `REDIS_URL`).

### Autenticação

Não há tela de login nem tabela de usuários: o painel roda localmente. Toda mutação é registrada em `audit_logs` com `actorLabel = "local-admin"` (constante `LOCAL_ACTOR` em `src/lib/audit.ts`).

## Variáveis de ambiente

Veja `.env.example`. As principais: `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `SHORT_BASE_URL` (domínio público dos links, ex.: `https://links.adanutraceuticos.com.br`), `HASH_SECRET`, `RATE_LIMIT_REDIRECT_PER_MINUTE`, `RATE_LIMIT_API_PER_MINUTE`, `REDIRECT_CACHE_TTL_SECONDS`, `ALLOWED_DESTINATION_HOSTS`, `GEOIP_ENABLED`.

Em produção, aponte o DNS de `links.adanutraceuticos.com.br` para a aplicação e defina `SHORT_BASE_URL` com esse domínio; o painel pode ficar no mesmo host (`/admin`) ou em outro (`APP_URL`).
