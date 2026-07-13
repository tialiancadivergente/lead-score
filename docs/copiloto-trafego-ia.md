# Copiloto de Tráfego (IA) — Manual Técnico e Operacional

## 1. Contexto

O Dashboard de Lançamentos (`launch-dashboard`) já expõe KPIs, tabela de anúncios,
série temporal e alertas simples baseados em meta (`GET /launch-dashboard/notifications`).
Esse alerta existente compara um valor atual contra uma meta configurada e calcula
`%diff` — mas não explica a causa, não olha por anúncio e não sugere ação.

O Copiloto de Tráfego (IA) é um módulo novo que atua como um gestor de tráfego
sênior sobre esses mesmos dados:

- detecta riscos por anúncio (fadiga de criativo, CPL/CPC/CPM em alta, CTR/connect
  rate em queda, gasto sem conversão) e riscos de meta do lançamento, **antes** de
  esperar o usuário reparar manualmente;
- gera, via OpenAI, uma explicação em português e uma recomendação de ação para
  cada risco detectado;
- permite conversas livres ("por que o CPL subiu essa semana?") onde o modelo
  consulta os dados reais do lançamento via *tool calling* — nunca inventa número.

O módulo **não duplica** nenhuma query analítica: todas as ferramentas do chat são
wrappers 1:1 de métodos já existentes em `LaunchDashboardService`.

## 2. Objetivo

- alertas de risco proativos, gerados em background, por lançamento e por anúncio;
- chat de análise sob demanda, escopado a um lançamento;
- configuração por lançamento (sensibilidade, regras ativas, contexto extra) sem
  precisar de deploy para ajustar comportamento.

## 3. Visão geral da arquitetura

Fluxo macro do motor de risco (background):

1. `CopilotRiskEngineService` roda em um `setInterval` (mesmo padrão de
   `MetaSchedulerService`), controlado por `COPILOT_RISK_SCAN_ENABLED` /
   `COPILOT_RISK_SCAN_INTERVAL_MINUTES`.
2. A cada ciclo, busca lançamentos com `launch_dashboard_config.notification_date_from`
   e `notification_date_to` preenchidos — reaproveita esse campo (já usado pela
   feature de notificações) como "janela ativa" do lançamento, sem precisar de mais
   um campo de configuração para a mesma ideia.
3. Para cada lançamento, consulta `meta_ad_performance` agrupado por
   `external_ad_id` + `report_date` dentro da janela, separa os últimos
   `RECENT_WINDOW_DAYS` dias ("recente") do restante ("baseline") e avalia 6 regras
   determinísticas (seção 7).
4. Quando uma regra dispara, chama `CopilotLlmService.explainRiskSignal(...)`
   **uma única vez** para gerar `narrative` + `recommendation` + `severity`.
5. Persiste o alerta em `copilot_risk_alert`, com dedupe por
   `(launch_id, external_ad_id, rule_key, detected_on)` — não recria o mesmo
   alerta em ciclos seguintes.

Fluxo macro do chat (on-demand):

1. Frontend cria uma conversa (`POST /copilot/conversations`) escopada a um
   `launchId`.
2. Usuário envia uma mensagem (`POST /copilot/conversations/:id/messages`).
3. `CopilotChatService` monta o histórico + system prompt (com `extra_context` do
   `copilot_config`, se existir) e chama `CopilotLlmService.complete(...)` com a
   lista de tools.
4. Se o modelo pedir uma tool, `CopilotToolsService.dispatch(...)` executa o
   método correspondente em `LaunchDashboardService` (ou lê `copilot_risk_alert`)
   e o resultado volta pro modelo. Repete até no máximo `MAX_TOOL_ITERATIONS` (5)
   rodadas.
5. A resposta final é persistida em `copilot_message` (role `assistant`), junto
   com um log das tools chamadas nesse turno (`tool_calls`, só para auditoria).

## 4. Componentes e tabelas principais

### 4.1 Tabelas novas

- `copilot_conversation`
- `copilot_message`
- `copilot_risk_alert`
- `copilot_config`

Migrations: `1781900000003-CreateCopilotTables.ts` (tabelas) e
`1781900000004-AddCopilotRbacModule.ts` (permissões RBAC do módulo `copilot`).

### 4.2 Entidades

- `CopilotConversation` (`src/database/entities/copilot/copilot-conversation.entity.ts`)
- `CopilotMessage` (`.../copilot-message.entity.ts`)
- `CopilotRiskAlert` (`.../copilot-risk-alert.entity.ts`)
- `CopilotConfig` (`.../copilot-config.entity.ts`)

### 4.3 Services e módulo

- `CopilotLlmService` — wrapper do SDK `openai` (chat completions + tool calling).
- `CopilotToolsService` — schemas das tools e dispatcher para `LaunchDashboardService`.
- `CopilotRiskEngineService` — scheduler + regras determinísticas de risco.
- `CopilotChatService` — conversas, mensagens e o loop de tool calling.
- `CopilotConfigService` — CRUD de `copilot_config` + helpers de sensibilidade/regras ativas.
- `CopilotRiskAlertsService` — CRUD de `copilot_risk_alert` (list, updateStatus, createIfNotExists com dedupe).
- `CopilotController` / `CopilotModule`.

### 4.4 Dependência do `launch-dashboard`

`LaunchDashboardModule` agora exporta `LaunchDashboardService` (antes só usado
internamente) para que `CopilotModule` o importe e reaproveite as queries.

## 5. Configuração e pré-requisitos

### Envs relevantes

```env
OPENAI_API_KEY=change-me
OPENAI_MODEL=gpt-4o
COPILOT_RISK_SCAN_ENABLED=false
COPILOT_RISK_SCAN_INTERVAL_MINUTES=60
```

`OPENAI_MODEL` é lido em runtime (`ConfigService`) — não há model id hardcoded no
código, então pode ser trocado por qualquer modelo da OpenAI que a conta tenha
acesso (`gpt-4o`, `gpt-4.1`, etc.) sem precisar alterar código.

### Deploy (AKS)

`OPENAI_MODEL`, `COPILOT_RISK_SCAN_ENABLED` e `COPILOT_RISK_SCAN_INTERVAL_MINUTES`
já foram adicionados ao `k8s/01-configmap.yaml` (não são sensíveis).

`OPENAI_API_KEY` é sensível — já foi adicionado à lista `SENSITIVE_VARS` de
`create-k8s-secrets.sh`, então basta ter `OPENAI_API_KEY=<chave real>` no `.env`
usado por esse script (não é o `.env.local` de desenvolvimento) antes de rodar:

```bash
./create-k8s-secrets.sh
```

`k8s/03-deployment.yaml` já injeta tudo do ConfigMap e do Secret via `envFrom` —
não precisa editar o deployment pra essas variáveis chegarem no container.

### RBAC

Módulo `copilot` com actions `view`/`create`/`update`/`delete` (mesmo padrão dos
demais módulos). A migration `AddCopilotRbacModule` já dá:

- `super_admin` e `admin`: todas as actions.
- `viewer`: só `view`.

Endpoints de leitura exigem `copilot:view`; `PUT /copilot/config/:launchId` e
`PATCH /copilot/risk-alerts/:id` exigem `copilot:update`.

### Migrations

```bash
npm run migration:run
```

Migrations críticas: `1781900000003-CreateCopilotTables.ts` e
`1781900000004-AddCopilotRbacModule.ts`.

## 6. Endpoints

Todos protegidos por `ApiKeyGuard` (só ativo se `API_KEY_ENABLED=true`) +
`JwtAuthGuard` + `PermissionGuard`, igual ao `launch-dashboard`.

### 6.1 `GET /copilot/conversations?launchId=`

Lista conversas de um lançamento (ou todas, se `launchId` omitido).

```json
[
  {
    "id": "b2f...",
    "launch_id": "12345678-0000-0000-0000-000000000001",
    "user_id": "a1c...",
    "title": null,
    "created_at": "2026-07-13T10:00:00.000Z",
    "updated_at": "2026-07-13T10:05:00.000Z"
  }
]
```

### 6.2 `POST /copilot/conversations`

Body:

```json
{ "launchId": "12345678-0000-0000-0000-000000000001", "title": "opcional" }
```

Retorna a conversa criada (mesma forma do item acima). `user_id` é preenchido a
partir do usuário autenticado (`req.user.id`).

### 6.3 `GET /copilot/conversations/:id/messages`

```json
[
  { "id": "...", "conversation_id": "...", "role": "user", "content": "Por que o CPL subiu essa semana?", "tool_calls": null, "created_at": "..." },
  { "id": "...", "conversation_id": "...", "role": "assistant", "content": "O anúncio \"...\" teve CTR...", "tool_calls": [{ "name": "get_timeseries", "arguments": "{...}" }], "created_at": "..." }
]
```

### 6.4 `POST /copilot/conversations/:id/messages`

Body: `{ "content": "texto da pergunta" }`.

Executa o loop de tool calling (pode levar alguns segundos) e retorna a mensagem
final do assistente (mesma forma da linha `role: "assistant"` acima).

### 6.5 `GET /copilot/risk-alerts?launchId=&status=open`

```json
[
  {
    "id": "...",
    "launch_id": "...",
    "external_ad_id": "1234567890",
    "ad_name": "Criativo A",
    "rule_key": "CPL_SPIKE",
    "detected_on": "2026-07-12",
    "severity": "warning",
    "title": "CPL (custo por lead) do anúncio \"Criativo A\" subiu 42%",
    "narrative": "O CPL subiu porque o CTR caiu de 3.2% para 1.8% nos últimos 2 dias...",
    "recommendation": "Pausar o criativo e testar uma variação de gancho.",
    "current_value": 12.4,
    "baseline_value": 8.7,
    "pct_diff": 42.5,
    "status": "open",
    "created_at": "...",
    "updated_at": "..."
  }
]
```

`status` filtra por `open` / `acknowledged` / `resolved` / `dismissed_false_positive`.

### 6.6 `PATCH /copilot/risk-alerts/:id`

Body: `{ "status": "acknowledged" | "resolved" | "dismissed_false_positive" }`.
Retorna o alerta atualizado.

### 6.7 `GET /copilot/config/:launchId`

Retorna o `copilot_config` do lançamento ou `null` se nunca configurado (nesse
caso, o motor de risco assume sensibilidade `medium` e todas as regras ativas).

### 6.8 `PUT /copilot/config/:launchId`

Body:

```json
{
  "riskSensitivity": "low" | "medium" | "high",
  "enabledRules": ["CPL_SPIKE", "ZERO_CONVERSION"],
  "extraContext": "Ignore quedas de sábado/domingo, esse público não compra fim de semana."
}
```

`enabledRules` vazio/nulo = todas as regras ativas. `extraContext` é injetado no
system prompt tanto do chat quanto da geração de narrativa dos alertas.

## 7. Regras de risco (motor determinístico)

Nenhuma regra chama a LLM para *detectar* — só para *explicar* depois de disparar.
Constantes em `copilot-risk-engine.service.ts`.

| `rule_key` | O que mede | Direção "ruim" | Threshold base | Nível |
|---|---|---|---|---|
| `CPL_SPIKE` | spend/leads recente vs baseline (7d) | subir | 30% | anúncio |
| `CPC_SPIKE` | spend/clicks recente vs baseline | subir | 30% | anúncio |
| `CTR_DROP` | clicks/impressions recente vs baseline | cair | 30% | anúncio |
| `CONNECT_RATE_DROP` | landing_page_views/clicks recente vs baseline | cair | 30% | anúncio |
| `ZERO_CONVERSION` | spend do dia ≥ piso e 0 leads/checkouts | — | R$50 (piso) | anúncio |
| `TARGET_BREACH_CPL` | CPL dos últimos 3 dias vs `target_cpl` do lançamento | subir | 15% | lançamento |

- Janela "recente": últimos `RECENT_WINDOW_DAYS=2` dias dentro da janela ativa.
- Janela "baseline": os `BASELINE_WINDOW_DAYS=7` dias anteriores. Exige no mínimo
  `MIN_BASELINE_DAYS=3` dias de baseline — anúncio novo demais não gera alerta de
  spike/drop (ainda geraria `ZERO_CONVERSION` se aplicável).
- `risk_sensitivity` multiplica os thresholds: `low` = ×1.5 (menos sensível),
  `medium` = ×1 (default), `high` = ×0.6 (mais sensível). Também ajusta o piso de
  `ZERO_CONVERSION` (R$75 / R$50 / R$30 respectivamente).
- `enabled_rules` em `copilot_config` pode desativar qualquer regra por lançamento.

## 8. Tools do chat

Cada tool exposta ao modelo é 1:1 com um método já existente — nenhuma query nova:

| Tool | Método reaproveitado |
|---|---|
| `get_summary` | `LaunchDashboardService.getSummary` |
| `get_funnel_table` | `LaunchDashboardService.getFunnelTable` |
| `get_timeseries` | `LaunchDashboardService.getTimeseries` |
| `get_tier_distribution` | `LaunchDashboardService.getTierDistribution` |
| `get_awareness_metrics` | `LaunchDashboardService.getAwarenessMetrics` |
| `get_launch_config` | `LaunchDashboardService.getConfig` |
| `get_open_risk_alerts` | `CopilotRiskAlertsService.list(launchId, 'open')` |

O `launchId` nunca é um argumento que o modelo escolhe — ele vem sempre da
conversa (`copilot_conversation.launch_id`), então o modelo não pode "vazar" dados
de outro lançamento mesmo que tente.

## 9. Como testar localmente

```bash
npm run migration:run
npm run start:dev
```

1. `POST /auth/login` com um usuário existente do backoffice → copiar `accessToken`.
2. Usar `Authorization: Bearer <accessToken>` em todas as chamadas abaixo (ou usar
   o botão "Authorize" em `http://localhost:3000/docs`).
3. `GET /launch-dashboard/launches` → pegar um `launchId` real.
4. `PUT /copilot/config/:launchId` (opcional) para ajustar sensibilidade.
5. `POST /copilot/conversations` com `{ "launchId": "..." }`.
6. `POST /copilot/conversations/:id/messages` com uma pergunta real sobre o
   período — a resposta pode levar alguns segundos (múltiplas chamadas de tool).
7. `GET /copilot/risk-alerts?launchId=...` — só populado se o motor de risco já
   rodou (`COPILOT_RISK_SCAN_ENABLED=true`) para um lançamento com
   `notification_date_from`/`notification_date_to` configurados.

Não existe endpoint manual para forçar um ciclo do scan fora do interval — se for
necessário para QA, avaliar expor um `POST /copilot/risk-alerts/scan` protegido
por permissão de admin (não incluído no MVP para não abrir uma rota de execução
arbitrária sem necessidade real).

## 10. Troubleshooting

### `Error: OPENAI_API_KEY não configurada.`

`OPENAI_API_KEY` ausente ou igual a `change-me` no env carregado. Confirmar que
`.env.local`/`.env` tem a chave real e que o processo foi reiniciado depois de
editar o arquivo (env é lido só no boot).

### `GET /copilot/risk-alerts` sempre vazio

Verificar, em ordem:

- `COPILOT_RISK_SCAN_ENABLED=true`?
- o lançamento tem `launch_dashboard_config.notification_date_from` e
  `notification_date_to` preenchidos? (é a janela que o motor usa)
- existem pelo menos `MIN_BASELINE_DAYS` dias de dados em `meta_ad_performance`
  antes do período recente?
- a regra em questão está em `enabled_rules` (ou `enabled_rules` está `null`)?

### Chat demora ou parece travar

Esperado — cada rodada de tool calling é uma chamada real à OpenAI. Timeout do
client HTTP (Postman, frontend) deve ser generoso (15-30s). Se ultrapassar
`MAX_TOOL_ITERATIONS` (5) sem resposta final, o serviço retorna uma mensagem de
fallback ao invés de travar indefinidamente.

### `403 Forbidden` em qualquer rota `/copilot/*`

Usuário sem permissão `copilot:view` (leitura) ou `copilot:update` (escrita).
Conferir roles do usuário — a migration só dá essas permissões automaticamente
para `super_admin`/`admin`/`viewer`.

### Alerta duplicado não aparece de novo

É esperado: dedupe único por `(launch_id, external_ad_id, rule_key, detected_on)`.
Se quiser forçar recriação para teste, seria necessário limpar a linha
correspondente em `copilot_risk_alert` diretamente no banco.

## 11. Limitações conhecidas / próximos passos

MVP atual:

- alertas de risco proativos (6 regras) + chat com tool calling funcionando.
- configuração por lançamento (sensibilidade, regras, contexto extra).

Pendências / próximos passos:

- não há endpoint manual para forçar um ciclo do scan (útil para QA/demo).
- chat é síncrono (request/response); não há streaming da resposta.
- `meta_ad_performance` não tem `launch_id` — a "janela ativa" do lançamento é
  inferida via `notification_date_from`/`notification_date_to`, então lançamentos
  sem essa janela configurada não são escaneados pelo motor de risco (o chat
  funciona normalmente, pois usa sempre o range de datas informado na conversa).
- sem tracking automático de falso-positivo (`dismissed_false_positive` é
  registrado, mas nada hoje realimenta os thresholds a partir disso).
- sem testes automatizados específicos do módulo ainda.
