import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { GoogleAdsOAuthService } from './google-ads-oauth.service';
import { MetaAdsOAuthService } from './meta-ads-oauth.service';

@ApiTags('oauth')
@Controller('oauth')
export class OauthController {
  constructor(
    private readonly googleAdsOAuthService: GoogleAdsOAuthService,
    private readonly metaAdsOAuthService: MetaAdsOAuthService,
  ) {}

  @ApiOperation({
    summary: 'Pagina MVP para testar o fluxo Google Ads no backend',
    description:
      'Entrega uma pagina HTML simples para iniciar o login, listar contas e selecionar a conta Google Ads.',
  })
  @ApiOkResponse({
    description: 'Pagina HTML entregue com sucesso.',
  })
  @Get('google-ads/page')
  @Header('Content-Type', 'text/html; charset=utf-8')
  renderGoogleAdsPage() {
    return this.renderMarketingOauthPage();
  }

  private renderMarketingOauthPage() {
    return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Marketing OAuth MVP</title>
    <style>
      :root {
        --bg: #efe7da;
        --panel: #fffaf1;
        --panel-strong: #f7efe2;
        --text: #1f1a17;
        --muted: #6d6258;
        --line: #d8cbbd;
        --accent: #0f766e;
        --accent-2: #1d4ed8;
        --accent-3: #c2410c;
        --error: #b91c1c;
        --shadow: 0 18px 40px rgba(31, 26, 23, 0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(194, 65, 12, 0.14), transparent 28%),
          radial-gradient(circle at bottom right, rgba(15, 118, 110, 0.18), transparent 32%),
          var(--bg);
      }
      .wrap {
        max-width: 1180px;
        margin: 0 auto;
        padding: 48px 20px 72px;
      }
      .hero { display: grid; gap: 18px; margin-bottom: 28px; }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        width: fit-content;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid rgba(15, 118, 110, 0.22);
        background: rgba(255, 250, 241, 0.72);
        color: var(--accent);
        font-size: 0.9rem;
      }
      h1 {
        margin: 0;
        font-size: clamp(2.4rem, 6vw, 4.4rem);
        line-height: 0.95;
        letter-spacing: -0.05em;
        text-transform: uppercase;
      }
      .sub { max-width: 760px; color: var(--muted); font-size: 1.05rem; line-height: 1.6; }
      .hero-grid {
        display: grid;
        grid-template-columns: 1.35fr 0.65fr;
        gap: 20px;
        align-items: start;
      }
      .grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 20px; }
      .card {
        background: color-mix(in srgb, var(--panel) 92%, white 8%);
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 24px;
        box-shadow: var(--shadow);
      }
      .card.soft { background: color-mix(in srgb, var(--panel-strong) 90%, white 10%); }
      .card h2 { margin: 0 0 10px; font-size: 1.2rem; }
      .stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }
      .stat {
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: rgba(255,255,255,0.74);
      }
      .stat strong {
        display: block;
        font-size: 1.8rem;
        letter-spacing: -0.05em;
      }
      .stat span {
        display: block;
        color: var(--muted);
        margin-top: 6px;
        font-size: 0.92rem;
      }
      .provider-tabs { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
      .provider-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: transparent;
        cursor: pointer;
        color: var(--text);
        transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
      }
      .provider-chip.active {
        background: rgba(15, 118, 110, 0.1);
        border-color: rgba(15, 118, 110, 0.25);
        transform: translateY(-1px);
      }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0 0; }
      button {
        border: 0;
        border-radius: 999px;
        padding: 12px 18px;
        font: inherit;
        cursor: pointer;
        background: var(--accent);
        color: white;
        transition: transform 140ms ease, opacity 140ms ease, box-shadow 140ms ease;
        box-shadow: 0 8px 20px rgba(31, 26, 23, 0.08);
      }
      button:hover { transform: translateY(-1px); }
      button.google { background: var(--accent-2); }
      button.meta { background: var(--accent-3); }
      button.ghost {
        background: transparent;
        color: var(--text);
        border: 1px solid var(--line);
        box-shadow: none;
      }
      button:disabled { opacity: 0.55; cursor: wait; }
      .status {
        margin-top: 16px;
        padding: 14px 16px;
        border-radius: 16px;
        background: rgba(255,255,255,0.66);
        border: 1px solid var(--line);
        white-space: pre-wrap;
      }
      .status.error { border-color: rgba(185, 28, 28, 0.2); color: var(--error); }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 16px;
        margin-bottom: 8px;
      }
      .section-header p {
        margin: 0;
        color: var(--muted);
        font-size: 0.95rem;
      }
      .meta { display: grid; gap: 12px; margin-top: 18px; }
      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding-bottom: 12px;
        border-bottom: 1px dashed var(--line);
      }
      .meta-row span:first-child { color: var(--muted); }
      .list { display: grid; gap: 12px; margin-top: 18px; }
      .account {
        padding: 16px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255,255,255,0.72);
        transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
      }
      .account:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 24px rgba(31, 26, 23, 0.06);
      }
      .job-card {
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(247, 239, 226, 0.9));
      }
      .job-card.failed {
        border-color: rgba(185, 28, 28, 0.22);
        background: linear-gradient(180deg, rgba(255,245,245,0.94), rgba(255,237,237,0.98));
      }
      .job-card.completed {
        border-color: rgba(15, 118, 110, 0.2);
        background: linear-gradient(180deg, rgba(243,255,252,0.95), rgba(237,250,247,0.98));
      }
      .job-card.pending,
      .job-card.running {
        border-color: rgba(29, 78, 216, 0.18);
        background: linear-gradient(180deg, rgba(245,248,255,0.95), rgba(237,244,255,0.98));
      }
      .job-top {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 12px;
      }
      .job-top strong {
        display: block;
        font-size: 1.55rem;
        letter-spacing: -0.04em;
      }
      .job-kind {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--line);
        color: var(--muted);
        background: rgba(255,255,255,0.7);
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border: 1px solid transparent;
      }
      .status-badge.failed {
        color: #991b1b;
        background: rgba(254, 226, 226, 0.95);
        border-color: rgba(185, 28, 28, 0.22);
      }
      .status-badge.completed {
        color: #065f46;
        background: rgba(209, 250, 229, 0.95);
        border-color: rgba(15, 118, 110, 0.2);
      }
      .status-badge.pending,
      .status-badge.running {
        color: #1d4ed8;
        background: rgba(219, 234, 254, 0.95);
        border-color: rgba(29, 78, 216, 0.18);
      }
      .job-meta {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }
      .job-meta-item {
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(216, 203, 189, 0.9);
        background: rgba(255,255,255,0.72);
      }
      .job-meta-item span {
        display: block;
        color: var(--muted);
        font-size: 0.78rem;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .job-meta-item strong {
        display: block;
        font-size: 1rem;
      }
      .raw-card {
        padding: 18px;
        border: 1px solid rgba(29, 78, 216, 0.18);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(248,250,255,0.96), rgba(238,243,255,0.98));
      }
      .perf-card {
        padding: 18px;
        border: 1px solid rgba(15, 118, 110, 0.16);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(246,255,252,0.96), rgba(236,250,246,0.98));
      }
      .account strong { display: block; margin-bottom: 6px; }
      .account small { display: block; color: var(--muted); margin-bottom: 12px; }
      .account.warning {
        border-color: rgba(194, 65, 12, 0.35);
        background: rgba(255, 247, 237, 0.92);
      }
      .account.restricted {
        background: rgba(84, 61, 46, 0.92);
        border-color: rgba(84, 61, 46, 0.9);
        color: #fff8ef;
      }
      .account.restricted small,
      .account.restricted .hint {
        color: rgba(255, 248, 239, 0.78);
      }
      .account.restricted .pill {
        color: rgba(255, 248, 239, 0.86);
        border-color: rgba(255, 248, 239, 0.2);
      }
      .account.restricted .pill.error {
        color: #ffd6bf;
        border-color: rgba(255, 214, 191, 0.28);
      }
      .pill {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid var(--line);
        color: var(--muted);
        font-size: 0.8rem;
      }
      .pill.error { color: #9a3412; border-color: rgba(194, 65, 12, 0.35); }
      .hint { margin-top: 12px; color: #9a3412; font-size: 0.92rem; line-height: 1.5; }
      .foot { margin-top: 22px; color: var(--muted); font-size: 0.94rem; }
      pre {
        margin: 12px 0 0;
        white-space: pre-wrap;
        overflow: auto;
        font-size: 12px;
        background: rgba(255,255,255,0.75);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 12px;
      }
      @media (max-width: 980px) {
        .hero-grid,
        .grid { grid-template-columns: 1fr; }
        .stats { grid-template-columns: 1fr; }
        .job-meta { grid-template-columns: 1fr 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="hero-grid">
        <div class="hero">
          <span class="eyebrow">MVP Backend Console</span>
          <h1>Conectar, Sincronizar e Extrair</h1>
          <p class="sub">
            Esta tela concentra o fluxo operacional minimo dos canais de midia: autenticar Google Ads e Meta Ads,
            validar contas acessiveis, sincronizar estruturas e disparar a extracao inicial.
          </p>
        </div>
        <div class="card soft">
          <div class="stats">
            <div class="stat">
              <strong>2</strong>
              <span>Providers integrados no MVP</span>
            </div>
            <div class="stat">
              <strong>1</strong>
              <span>Fluxo unificado para OAuth e extracao</span>
            </div>
            <div class="stat">
              <strong>T-1</strong>
              <span>Janela padrao para extracao diaria</span>
            </div>
          </div>
        </div>
      </section>

      <section class="grid">
        <div class="card">
          <div class="section-header">
            <div>
              <h2>Fluxo</h2>
              <p>Escolha o provider, autentique e siga para sincronizacao e extracao.</p>
            </div>
          </div>
          <p class="sub">
            Escolha o provider, clique em conectar e finalize o consentimento. Ao voltar, esta mesma pagina
            busca a conexao criada, lista as contas acessiveis e permite selecionar a conta final.
          </p>

          <div class="provider-tabs">
            <button id="providerGoogle" class="provider-chip active" type="button">Google Ads</button>
            <button id="providerMeta" class="provider-chip" type="button">Meta Ads</button>
          </div>

          <div class="actions">
            <input id="apiKeyInput" type="password" placeholder="x-api-key para endpoints internos" style="flex:1; min-width:260px; border:1px solid var(--line); border-radius:999px; padding:12px 18px; font:inherit; background:rgba(255,255,255,0.9);" />
            <button id="saveApiKeyBtn" class="ghost" type="button">Salvar API Key</button>
          </div>

          <div class="actions">
            <button id="connectGoogleBtn" class="google">Conectar Google Ads</button>
            <button id="connectMetaBtn" class="meta">Conectar Meta Ads</button>
            <button id="refreshBtn" class="ghost">Atualizar conexoes</button>
            <button id="clearBtn" class="ghost">Limpar estado da pagina</button>
          </div>

          <div id="status" class="status">Nenhuma acao executada ainda.</div>
          <div id="connectionMeta" class="meta"></div>
        </div>

        <div class="card">
          <div class="section-header">
            <div>
              <h2>Conexao atual</h2>
              <p>Resumo da conexao ativa para o provider selecionado.</p>
            </div>
          </div>
          <div id="connectionSummary" class="sub">Nenhuma conexao selecionada.</div>
          <div class="foot">
            Callback padrao desta pagina:
            <br />
            <code id="pageUrl"></code>
          </div>
        </div>
      </section>

      <section class="card" style="margin-top: 20px;">
        <div class="section-header">
          <div>
            <h2 id="accountsTitle">Contas acessiveis</h2>
            <p>Contas retornadas diretamente pelo provider apos a autenticacao OAuth.</p>
          </div>
        </div>
        <div id="accounts" class="list">
          <div class="sub">As contas aparecerao aqui apos uma conexao valida.</div>
        </div>
      </section>

      <section class="card" style="margin-top: 20px;">
        <div class="section-header">
          <div>
            <h2>Sincronizacao e Extracao</h2>
            <p>Ferramentas operacionais para staging, consolidacao e diagnostico.</p>
          </div>
        </div>
        <p class="sub">
          Esta area usa os endpoints internos de marketing-sync para testar sincronizacao de contas, marcacao para extracao e criacao de jobs.
        </p>
        <div class="actions">
          <button id="syncAccountsBtn" class="ghost" type="button">Sincronizar contas desta conexao</button>
          <button id="refreshSyncedBtn" class="ghost" type="button">Atualizar contas sincronizadas</button>
          <button id="createJobsBtn" class="ghost" type="button">Criar jobs de yesterday</button>
          <button id="listJobsBtn" class="ghost" type="button">Atualizar jobs</button>
        </div>
        <div id="syncedAccounts" class="list" style="margin-top: 18px;">
          <div class="sub">As contas sincronizadas aparecerao aqui apos a primeira sincronizacao manual.</div>
        </div>
        <div id="jobs" class="list" style="margin-top: 18px;">
          <div class="sub">Os jobs de extracao aparecerao aqui.</div>
        </div>
        <div id="rawData" class="list" style="margin-top: 18px;">
          <div class="sub">Os payloads brutos extraidos aparecerao aqui.</div>
        </div>
        <div id="performanceData" class="list" style="margin-top: 18px;">
          <div class="sub">A performance consolidada aparecera aqui.</div>
        </div>
      </section>
    </div>

    <script>
      const PROVIDERS = {
        google_ads: {
          label: 'Google Ads',
          authorizePath: '/oauth/google-ads/authorize',
          accountsPath: (id) => '/oauth/google-ads/connections/' + id + '/accounts',
          selectPath: (id) => '/oauth/google-ads/connections/' + id + '/select-account',
          storageKey: 'googleAdsConnectionId',
        },
        meta_ads: {
          label: 'Meta Ads',
          authorizePath: '/oauth/meta/authorize',
          accountsPath: (id) => '/oauth/meta/connections/' + id + '/accounts',
          selectPath: (id) => '/oauth/meta/connections/' + id + '/select-account',
          storageKey: 'metaAdsConnectionId',
        },
      };

      const statusEl = document.getElementById('status');
      const connectionMetaEl = document.getElementById('connectionMeta');
      const connectionSummaryEl = document.getElementById('connectionSummary');
      const accountsEl = document.getElementById('accounts');
      const accountsTitleEl = document.getElementById('accountsTitle');
      const refreshBtn = document.getElementById('refreshBtn');
      const clearBtn = document.getElementById('clearBtn');
      const pageUrlEl = document.getElementById('pageUrl');
      const providerGoogleBtn = document.getElementById('providerGoogle');
      const providerMetaBtn = document.getElementById('providerMeta');
      const connectGoogleBtn = document.getElementById('connectGoogleBtn');
      const connectMetaBtn = document.getElementById('connectMetaBtn');
      const apiKeyInput = document.getElementById('apiKeyInput');
      const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
      const syncAccountsBtn = document.getElementById('syncAccountsBtn');
      const refreshSyncedBtn = document.getElementById('refreshSyncedBtn');
      const createJobsBtn = document.getElementById('createJobsBtn');
      const listJobsBtn = document.getElementById('listJobsBtn');
      const syncedAccountsEl = document.getElementById('syncedAccounts');
      const jobsEl = document.getElementById('jobs');
      const rawDataEl = document.getElementById('rawData');
      const performanceDataEl = document.getElementById('performanceData');

      pageUrlEl.textContent = window.location.origin + window.location.pathname;
      apiKeyInput.value = localStorage.getItem('marketingSyncApiKey') || '';

      const query = new URLSearchParams(window.location.search);
      let activeProvider = query.get('provider') || localStorage.getItem('oauthActiveProvider') || 'google_ads';
      let currentConnectionId =
        query.get('connectionId') ||
        localStorage.getItem(PROVIDERS[activeProvider].storageKey);

      function setStatus(message, isError = false) {
        statusEl.textContent = message;
        statusEl.classList.toggle('error', isError);
      }

      function setBusy(isBusy) {
        connectGoogleBtn.disabled = isBusy;
        connectMetaBtn.disabled = isBusy;
        refreshBtn.disabled = isBusy;
        syncAccountsBtn.disabled = isBusy;
        refreshSyncedBtn.disabled = isBusy;
        createJobsBtn.disabled = isBusy;
        listJobsBtn.disabled = isBusy;
      }

      function providerLabel(provider) {
        return PROVIDERS[provider]?.label || provider;
      }

      function updateProviderUI() {
        providerGoogleBtn.classList.toggle('active', activeProvider === 'google_ads');
        providerMetaBtn.classList.toggle('active', activeProvider === 'meta_ads');
        accountsTitleEl.textContent = 'Contas acessiveis - ' + providerLabel(activeProvider);
        localStorage.setItem('oauthActiveProvider', activeProvider);
      }

      function setConnectionSummary(connection) {
        if (!connection) {
          connectionSummaryEl.textContent = 'Nenhuma conexao selecionada.';
          connectionMetaEl.innerHTML = '';
          return;
        }

        connectionSummaryEl.innerHTML =
          '<strong>' + providerLabel(connection.provider) + '</strong><br />' +
          (connection.externalUserEmail || 'Conta sem email');
        connectionMetaEl.innerHTML = [
          ['Connection ID', connection.id],
          ['Provider', providerLabel(connection.provider)],
          ['Status', connection.status],
          ['Conta selecionada', connection.externalAccountName || connection.externalAccountId || 'Nenhuma'],
          ['Expira em', connection.expiresAt || 'Nao informado'],
          ['Atualizado em', connection.updatedAt],
        ].map(([label, value]) =>
          '<div class="meta-row"><span>' + label + '</span><span>' + (value || '-') + '</span></div>'
        ).join('');
      }

      function renderAccounts(payload) {
        const accounts = payload?.accounts || [];
        if (!accounts.length) {
          accountsEl.innerHTML = '<div class="sub">Nenhuma conta acessivel foi encontrada para esta conexao.</div>';
          return;
        }

        accountsEl.innerHTML = accounts.map((account) => {
          const provider = payload.provider;
          const label = account.descriptiveName || account.name || account.customerId || account.accountId;
          const accountId = account.customerId || account.accountId;
          const selected = payload.selectedAccountId === accountId;
          const disabled = account.accessible === false;
          const metaInfo =
            provider === 'google_ads'
              ? 'ID: ' + account.customerId + ' | Fuso: ' + (account.timeZone || 'n/d') + ' | Moeda: ' + (account.currencyCode || 'n/d')
              : 'ID: ' + account.accountId + ' | Fuso: ' + (account.timeZone || 'n/d') + ' | Moeda: ' + (account.currency || 'n/d');

          return \`
            <div class="account \${disabled ? 'warning' : ''}">
              <strong>\${label}</strong>
              <small>\${metaInfo}</small>
              <div class="actions">
                <button class="ghost" \${disabled ? 'disabled' : ''} data-account-id="\${accountId}" data-account-name="\${(label || '').replace(/"/g, '&quot;')}">
                  \${disabled ? 'Sem permissao para selecionar' : selected ? 'Conta ja selecionada' : 'Selecionar conta'}
                </button>
                <span class="pill">\${provider === 'google_ads' ? (account.manager ? 'Manager' : 'Cliente') : 'Ad Account'}</span>
                <span class="pill">\${provider === 'google_ads' ? (account.testAccount ? 'Teste' : 'Producao') : (account.businessName || 'Meta')}</span>
                \${disabled ? '<span class="pill error">' + (account.errorCode || 'PERMISSION') + '</span>' : ''}
              </div>
              \${disabled ? '<div class="hint">' + (account.errorMessage || 'A conta foi retornada pelo provider, mas falhou na validacao de acesso.') + '</div>' : ''}
            </div>
          \`;
        }).join('');

        accountsEl.querySelectorAll('button[data-account-id]').forEach((button) => {
          button.addEventListener('click', async () => {
            if (!currentConnectionId) {
              setStatus('Nenhuma conexao disponivel para selecionar conta.', true);
              return;
            }

            try {
              setBusy(true);
              setStatus('Salvando conta ' + providerLabel(activeProvider) + ' selecionada...');
              const body =
                activeProvider === 'google_ads'
                  ? {
                      customerId: button.dataset.accountId,
                      customerName: button.dataset.accountName || undefined,
                    }
                  : {
                      accountId: button.dataset.accountId,
                      accountName: button.dataset.accountName || undefined,
                    };
              const response = await fetch(PROVIDERS[activeProvider].selectPath(currentConnectionId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
              const payload = await response.json();
              if (!response.ok) {
                throw new Error(payload.message || 'Falha ao selecionar conta.');
              }
              setStatus('Conta selecionada com sucesso em ' + providerLabel(activeProvider) + '.');
              await loadConnectionAndAccounts(currentConnectionId);
            } catch (error) {
              setStatus(error.message || 'Erro ao selecionar conta.', true);
            } finally {
              setBusy(false);
            }
          });
        });
      }

      function getApiKey() {
        return (apiKeyInput.value || localStorage.getItem('marketingSyncApiKey') || '').trim();
      }

      function getInternalHeaders() {
        const apiKey = getApiKey();
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
          headers['x-api-key'] = apiKey;
        }
        return headers;
      }

      function renderSyncedAccounts(accounts) {
        if (!accounts.length) {
          syncedAccountsEl.innerHTML = '<div class="sub">Nenhuma conta sincronizada ainda para este provider/conexao.</div>';
          return;
        }

        syncedAccountsEl.innerHTML = accounts.map((account) => \`
          <div class="account \${account.status === 'restricted' ? 'restricted' : ''}">
            <strong>\${account.externalAccountName || account.externalAccountId}</strong>
            <small>ID: \${account.externalAccountId} | Status: \${account.status} | Selecionada: \${account.selected ? 'sim' : 'nao'}</small>
            <div class="actions">
              <button class="ghost" \${account.status === 'restricted' ? 'disabled' : ''} data-sync-account-id="\${account.id}" data-next-selected="\${account.selected ? 'false' : 'true'}">
                \${account.status === 'restricted' ? 'Conta restrita para extracao' : account.selected ? 'Desmarcar extracao' : 'Marcar para extracao'}
              </button>
              \${account.status === 'restricted' ? '<span class="pill error">RESTRICTED</span>' : ''}
            </div>
            \${account.status === 'restricted' ? '<div class="hint">Esta conta foi descoberta na conexao, mas falhou na validacao de acesso e nao deve ser usada para extracao.</div>' : ''}
          </div>
        \`).join('');

        syncedAccountsEl.querySelectorAll('button[data-sync-account-id]').forEach((button) => {
          button.addEventListener('click', async () => {
            try {
              setBusy(true);
              const response = await fetch('/marketing-sync/accounts/' + button.dataset.syncAccountId + '/selection', {
                method: 'PATCH',
                headers: getInternalHeaders(),
                body: JSON.stringify({
                  selected: button.dataset.nextSelected === 'true',
                }),
              });
              const payload = await response.json();
              if (!response.ok) {
                throw new Error(payload.message || 'Falha ao atualizar selecao da conta.');
              }
              setStatus('Selecao de extracao atualizada.');
              await loadSyncedAccounts();
              await loadRawData();
              await loadPerformanceData();
            } catch (error) {
              setStatus(error.message || 'Erro ao atualizar selecao.', true);
            } finally {
              setBusy(false);
            }
          });
        });
      }

      function renderJobs(jobs) {
        if (!jobs.length) {
          jobsEl.innerHTML = '<div class="sub">Nenhum job encontrado para o provider atual.</div>';
          return;
        }

        jobsEl.innerHTML = jobs.map((job) => \`
          <div class="job-card \${job.status}">
            <div class="job-top">
              <div>
                <span class="job-kind">Job de Extracao</span>
                <strong>\${job.externalAccountId}</strong>
              </div>
              <span class="status-badge \${job.status}">\${job.status}</span>
            </div>
            <div class="job-meta">
              <div class="job-meta-item">
                <span>Data</span>
                <strong>\${job.dateFrom}</strong>
              </div>
              <div class="job-meta-item">
                <span>Preset</span>
                <strong>\${job.preset || 'n/d'}</strong>
              </div>
              <div class="job-meta-item">
                <span>Provider</span>
                <strong>\${providerLabel(job.provider)}</strong>
              </div>
              <div class="job-meta-item">
                <span>Resumo</span>
                <strong>\${job.metadata?.processingSummary ? JSON.stringify(job.metadata.processingSummary) : 'sem linhas extraidas'}</strong>
              </div>
            </div>
            <div class="actions">
              <button class="ghost" data-job-process-id="\${job.id}">Processar agora</button>
            </div>
            \${job.errorMessage ? '<div class="hint">' + job.errorMessage + '</div>' : ''}
          </div>
        \`).join('');

        jobsEl.querySelectorAll('button[data-job-process-id]').forEach((button) => {
          button.addEventListener('click', async () => {
            try {
              setBusy(true);
              const response = await fetch('/marketing-sync/jobs/' + button.dataset.jobProcessId + '/process', {
                method: 'POST',
                headers: getInternalHeaders(),
              });
              const payload = await response.json();
              if (!response.ok) {
                throw new Error(payload.message || 'Falha ao processar job.');
              }
              setStatus('Job processado com sucesso.');
              await loadJobs();
              await loadRawData();
              await loadPerformanceData();
            } catch (error) {
              setStatus(error.message || 'Erro ao processar job.', true);
            } finally {
              setBusy(false);
            }
          });
        });
      }

      function renderRawData(rows) {
        if (!rows.length) {
          rawDataEl.innerHTML = '<div class="sub">Nenhum payload bruto encontrado.</div>';
          return;
        }

        rawDataEl.innerHTML = rows.map((row) => \`
          <div class="raw-card">
            <strong>RAW - \${row.externalAccountId} - \${row.reportDate}</strong>
            <small>Provider: \${providerLabel(row.provider)} | Job: \${row.jobId}</small>
            <pre>\${JSON.stringify(row.payload, null, 2)}</pre>
          </div>
        \`).join('');
      }

      function renderPerformanceData(rows) {
        if (!rows.length) {
          performanceDataEl.innerHTML = '<div class="sub">Nenhuma performance consolidada encontrada.</div>';
          return;
        }

        performanceDataEl.innerHTML = rows.map((row) => \`
          <div class="perf-card">
            <strong>\${row.campaignName || row.externalCampaignId}</strong>
            <small>Conta: \${row.externalAccountId} | Data: \${row.reportDate} | Provider: \${providerLabel(row.provider)}</small>
            <small>Impressions: \${row.impressions} | Clicks: \${row.clicks} | Spend: \${row.spend} | Conversions: \${row.conversions || 'n/d'}</small>
          </div>
        \`).join('');
      }

      async function fetchConnections(provider) {
        const response = await fetch('/oauth/connections?provider=' + provider);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Falha ao listar conexoes.');
        }
        return payload;
      }

      async function loadConnectionAndAccounts(connectionId) {
        const connections = await fetchConnections(activeProvider);
        const connection = connections.find((item) => item.id === connectionId) || connections[0] || null;

        if (!connection) {
          currentConnectionId = null;
          localStorage.removeItem(PROVIDERS[activeProvider].storageKey);
          setConnectionSummary(null);
          renderAccounts(null);
          setStatus('Nenhuma conexao ' + providerLabel(activeProvider) + ' salva ainda.');
          return;
        }

        currentConnectionId = connection.id;
        localStorage.setItem(PROVIDERS[activeProvider].storageKey, currentConnectionId);
        setConnectionSummary(connection);

        const accountsResponse = await fetch(PROVIDERS[activeProvider].accountsPath(currentConnectionId));
        const accountsPayload = await accountsResponse.json();
        if (!accountsResponse.ok) {
          throw new Error(accountsPayload.message || 'Falha ao listar contas acessiveis.');
        }
        renderAccounts(accountsPayload);
          setStatus('Conexao ' + providerLabel(activeProvider) + ' carregada com sucesso.');
      }

      async function loadSyncedAccounts() {
        if (!currentConnectionId) {
          renderSyncedAccounts([]);
          return;
        }

        const response = await fetch(
          '/marketing-sync/accounts?provider=' + activeProvider + '&connectionId=' + currentConnectionId,
          { headers: getInternalHeaders() },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Falha ao listar contas sincronizadas.');
        }
        renderSyncedAccounts(payload);
      }

      async function loadJobs() {
        const response = await fetch(
          '/marketing-sync/jobs?provider=' + activeProvider,
          { headers: getInternalHeaders() },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Falha ao listar jobs.');
        }
        renderJobs(payload);
      }

      async function loadRawData() {
        const response = await fetch(
          '/marketing-sync/raw?provider=' + activeProvider + '&limit=5',
          { headers: getInternalHeaders() },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Falha ao listar raw.');
        }
        renderRawData(payload);
      }

      async function loadPerformanceData() {
        const response = await fetch(
          '/marketing-sync/performance?provider=' + activeProvider + '&limit=10',
          { headers: getInternalHeaders() },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Falha ao listar performance.');
        }
        renderPerformanceData(payload);
      }

      async function startAuthorization(provider) {
        try {
          activeProvider = provider;
          updateProviderUI();
          setBusy(true);
          setStatus('Gerando URL de autorizacao para ' + providerLabel(provider) + '...');
          const currentPage = window.location.origin + window.location.pathname;
          const response = await fetch(
            PROVIDERS[provider].authorizePath + '?frontendRedirectUrl=' + encodeURIComponent(currentPage),
          );
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message || 'Falha ao iniciar OAuth.');
          }
          setStatus('Redirecionando para ' + providerLabel(provider) + '...');
          window.location.href = payload.authorizationUrl;
        } catch (error) {
          setStatus(error.message || 'Erro ao iniciar OAuth.', true);
          setBusy(false);
        }
      }

      providerGoogleBtn.addEventListener('click', async () => {
        activeProvider = 'google_ads';
        currentConnectionId = localStorage.getItem(PROVIDERS[activeProvider].storageKey);
        updateProviderUI();
        await loadConnectionAndAccounts(currentConnectionId);
      });

      providerMetaBtn.addEventListener('click', async () => {
        activeProvider = 'meta_ads';
        currentConnectionId = localStorage.getItem(PROVIDERS[activeProvider].storageKey);
        updateProviderUI();
        await loadConnectionAndAccounts(currentConnectionId);
      });

      connectGoogleBtn.addEventListener('click', async () => startAuthorization('google_ads'));
      connectMetaBtn.addEventListener('click', async () => startAuthorization('meta_ads'));
      saveApiKeyBtn.addEventListener('click', () => {
        localStorage.setItem('marketingSyncApiKey', apiKeyInput.value || '');
        setStatus('API key salva localmente nesta pagina.');
      });

      refreshBtn.addEventListener('click', async () => {
        try {
          setBusy(true);
          setStatus('Atualizando conexoes...');
          await loadConnectionAndAccounts(currentConnectionId);
          await loadSyncedAccounts();
          await loadJobs();
          await loadRawData();
          await loadPerformanceData();
        } catch (error) {
          setStatus(error.message || 'Erro ao atualizar conexoes.', true);
        } finally {
          setBusy(false);
        }
      });

      syncAccountsBtn.addEventListener('click', async () => {
        try {
          if (!currentConnectionId) {
            throw new Error('Conecte um provider antes de sincronizar contas.');
          }
          setBusy(true);
          const response = await fetch('/marketing-sync/connections/' + currentConnectionId + '/accounts/refresh', {
            method: 'POST',
            headers: getInternalHeaders(),
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message || 'Falha ao sincronizar contas.');
          }
          setStatus('Contas sincronizadas com sucesso para ' + providerLabel(activeProvider) + '.');
          await loadSyncedAccounts();
          await loadRawData();
          await loadPerformanceData();
        } catch (error) {
          setStatus(error.message || 'Erro ao sincronizar contas.', true);
        } finally {
          setBusy(false);
        }
      });

      refreshSyncedBtn.addEventListener('click', async () => {
        try {
          setBusy(true);
          await loadSyncedAccounts();
          await loadRawData();
          await loadPerformanceData();
          setStatus('Contas sincronizadas carregadas.');
        } catch (error) {
          setStatus(error.message || 'Erro ao carregar contas sincronizadas.', true);
        } finally {
          setBusy(false);
        }
      });

      createJobsBtn.addEventListener('click', async () => {
        try {
          setBusy(true);
          const response = await fetch('/marketing-sync/jobs/daily', {
            method: 'POST',
            headers: getInternalHeaders(),
            body: JSON.stringify({
              provider: activeProvider,
              includeToday: false,
              enqueue: true,
            }),
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message || 'Falha ao criar jobs diarios.');
          }
          setStatus('Jobs diarios criados para ' + providerLabel(activeProvider) + '.');
          await loadJobs();
          await loadRawData();
          await loadPerformanceData();
        } catch (error) {
          setStatus(error.message || 'Erro ao criar jobs.', true);
        } finally {
          setBusy(false);
        }
      });

      listJobsBtn.addEventListener('click', async () => {
        try {
          setBusy(true);
          await loadJobs();
          await loadRawData();
          await loadPerformanceData();
          setStatus('Jobs carregados com sucesso.');
        } catch (error) {
          setStatus(error.message || 'Erro ao listar jobs.', true);
        } finally {
          setBusy(false);
        }
      });

      clearBtn.addEventListener('click', () => {
        localStorage.removeItem('googleAdsConnectionId');
        localStorage.removeItem('metaAdsConnectionId');
        localStorage.removeItem('marketingSyncApiKey');
        const url = new URL(window.location.href);
        url.search = '';
        window.location.href = url.toString();
      });

      (async () => {
        try {
          updateProviderUI();
          setBusy(true);
          if (query.get('connectionId')) {
            setStatus('Callback concluido. Carregando conexao...');
          }
          await loadConnectionAndAccounts(currentConnectionId);
          try {
            await loadSyncedAccounts();
            await loadJobs();
            await loadRawData();
            await loadPerformanceData();
          } catch (error) {
            // Os endpoints internos exigem x-api-key. Mantemos a pagina carregando mesmo sem ela.
          }
        } catch (error) {
          setStatus(error.message || 'Erro ao carregar a pagina.', true);
        } finally {
          setBusy(false);
        }
      })();
    </script>
  </body>
</html>`;
  }

  @ApiOperation({
    summary: 'Inicia o fluxo OAuth do Google Ads',
    description:
      'Gera e persiste um state OAuth e devolve a URL de autorizacao para o usuario abrir no navegador.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'UUID do usuario interno para vincular a conexao.',
  })
  @ApiQuery({
    name: 'frontendRedirectUrl',
    required: false,
    description:
      'URL opcional para onde o backend redireciona apos concluir o callback.',
  })
  @ApiOkResponse({
    description: 'URL de autorizacao gerada com sucesso.',
  })
  @ApiBadRequestResponse({
    description: 'userId invalido ou dados insuficientes.',
  })
  @Get('google-ads/authorize')
  authorizeGoogleAds(
    @Query('userId') userId?: string,
    @Query('frontendRedirectUrl') frontendRedirectUrl?: string,
  ) {
    return this.googleAdsOAuthService.createAuthorization({
      userId,
      frontendRedirectUrl,
    });
  }

  @ApiOperation({
    summary: 'Inicia o fluxo OAuth da Meta Ads',
    description:
      'Gera e persiste um state OAuth e devolve a URL de autorizacao da Meta para o usuario abrir no navegador.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'UUID do usuario interno para vincular a conexao.',
  })
  @ApiQuery({
    name: 'frontendRedirectUrl',
    required: false,
    description:
      'URL opcional para onde o backend redireciona apos concluir o callback.',
  })
  @ApiOkResponse({
    description: 'URL de autorizacao gerada com sucesso.',
  })
  @ApiBadRequestResponse({
    description: 'userId invalido ou dados insuficientes.',
  })
  @Get('meta/authorize')
  authorizeMetaAds(
    @Query('userId') userId?: string,
    @Query('frontendRedirectUrl') frontendRedirectUrl?: string,
  ) {
    return this.metaAdsOAuthService.createAuthorization({
      userId,
      frontendRedirectUrl,
    });
  }

  @ApiOperation({
    summary: 'Lista conexoes OAuth salvas',
    description:
      'Endpoint de apoio para validar se a conexao foi persistida no banco.',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    description: 'Filtra por provider, ex.: google_ads.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filtra por usuario interno.',
  })
  @ApiOkResponse({
    description: 'Lista de conexoes encontradas.',
  })
  @Get('connections')
  listConnections(
    @Query('provider') provider?: string,
    @Query('userId') userId?: string,
  ) {
    return this.googleAdsOAuthService.listConnections({
      provider,
      userId,
    });
  }

  @ApiOperation({
    summary: 'Lista contas Google Ads acessiveis pela conexao',
    description:
      'Usa o token salvo para consultar as contas diretamente acessiveis ao usuario autenticado.',
  })
  @ApiOkResponse({
    description: 'Lista de contas acessiveis retornada com sucesso.',
  })
  @ApiBadRequestResponse({
    description: 'Conexao sem refresh token ou credenciais invalidas.',
  })
  @Get('google-ads/connections/:connectionId/accounts')
  listGoogleAdsAccounts(@Param('connectionId') connectionId: string) {
    return this.googleAdsOAuthService.listAvailableAccounts(connectionId);
  }

  @ApiOperation({
    summary: 'Lista contas Meta Ads acessiveis pela conexao',
    description:
      'Usa o token salvo para consultar as ad accounts diretamente acessiveis ao usuario autenticado na Meta.',
  })
  @ApiOkResponse({
    description: 'Lista de contas acessiveis retornada com sucesso.',
  })
  @ApiBadRequestResponse({
    description: 'Conexao invalida ou token expirado.',
  })
  @Get('meta/connections/:connectionId/accounts')
  listMetaAdsAccounts(@Param('connectionId') connectionId: string) {
    return this.metaAdsOAuthService.listAvailableAccounts(connectionId);
  }

  @ApiOperation({
    summary: 'Seleciona a conta Google Ads da conexao',
    description:
      'Salva na conexao qual customer account sera usada pela plataforma.',
  })
  @ApiOkResponse({
    description: 'Conta selecionada com sucesso.',
  })
  @ApiBadRequestResponse({
    description: 'Conexao invalida ou customerId invalido.',
  })
  @Post('google-ads/connections/:connectionId/select-account')
  selectGoogleAdsAccount(
    @Param('connectionId') connectionId: string,
    @Body()
    body: {
      customerId?: string;
      customerName?: string;
    },
  ) {
    return this.googleAdsOAuthService.selectAccount({
      connectionId,
      customerId: body.customerId ?? '',
      customerName: body.customerName,
    });
  }

  @ApiOperation({
    summary: 'Seleciona a conta Meta Ads da conexao',
    description:
      'Salva na conexao qual ad account da Meta sera usada pela plataforma.',
  })
  @ApiOkResponse({
    description: 'Conta selecionada com sucesso.',
  })
  @ApiBadRequestResponse({
    description: 'Conexao invalida ou accountId invalido.',
  })
  @Post('meta/connections/:connectionId/select-account')
  selectMetaAdsAccount(
    @Param('connectionId') connectionId: string,
    @Body()
    body: {
      accountId?: string;
      accountName?: string;
    },
  ) {
    return this.metaAdsOAuthService.selectAccount({
      connectionId,
      accountId: body.accountId ?? '',
      accountName: body.accountName,
    });
  }

  @ApiOperation({
    summary: 'Callback OAuth do Google Ads',
    description:
      'Recebe o retorno do Google, troca o code por token e persiste a conexao.',
  })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Authorization code devolvido pelo Google.',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'State salvo no inicio do fluxo OAuth.',
  })
  @ApiQuery({
    name: 'error',
    required: false,
    description: 'Erro retornado pelo Google quando o consentimento falha.',
  })
  @ApiQuery({
    name: 'error_description',
    required: false,
    description: 'Descricao textual do erro retornado pelo Google.',
  })
  @ApiOkResponse({
    description: 'Conexao persistida com sucesso.',
  })
  @ApiBadRequestResponse({
    description: 'State invalido, expirado ou erro retornado pelo Google.',
  })
  @Get('google-ads/callback')
  async googleAdsCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.googleAdsOAuthService.handleCallback({
      code,
      state,
      error,
      errorDescription,
    });

    if (result.frontendRedirectUrl) {
      const redirectUrl = new URL(result.frontendRedirectUrl);
      redirectUrl.searchParams.set('provider', result.provider);
      redirectUrl.searchParams.set('connectionId', result.connectionId);
      redirectUrl.searchParams.set(
        'hasRefreshToken',
        String(result.hasRefreshToken),
      );
      response.redirect(redirectUrl.toString());
      return;
    }

    return result;
  }

  @ApiOperation({
    summary: 'Callback OAuth da Meta Ads',
    description:
      'Recebe o retorno da Meta, troca o code por token e persiste a conexao.',
  })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Authorization code devolvido pela Meta.',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'State salvo no inicio do fluxo OAuth.',
  })
  @ApiQuery({
    name: 'error',
    required: false,
    description: 'Erro retornado pela Meta quando o consentimento falha.',
  })
  @ApiQuery({
    name: 'error_reason',
    required: false,
    description: 'Motivo do erro retornado pela Meta.',
  })
  @ApiQuery({
    name: 'error_description',
    required: false,
    description: 'Descricao textual do erro retornado pela Meta.',
  })
  @ApiOkResponse({
    description: 'Conexao persistida com sucesso.',
  })
  @ApiBadRequestResponse({
    description: 'State invalido, expirado ou erro retornado pela Meta.',
  })
  @Get('meta/callback')
  async metaAdsCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_reason') errorReason: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.metaAdsOAuthService.handleCallback({
      code,
      state,
      error,
      errorReason,
      errorDescription,
    });

    if (result.frontendRedirectUrl) {
      const redirectUrl = new URL(result.frontendRedirectUrl);
      redirectUrl.searchParams.set('provider', result.provider);
      redirectUrl.searchParams.set('connectionId', result.connectionId);
      redirectUrl.searchParams.set(
        'hasRefreshToken',
        String(result.hasRefreshToken),
      );
      response.redirect(redirectUrl.toString());
      return;
    }

    return result;
  }
}
