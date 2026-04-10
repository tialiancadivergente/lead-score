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
        --bg: #f5f1e8;
        --panel: #fffaf1;
        --text: #1f1a17;
        --muted: #6d6258;
        --line: #d8cbbd;
        --accent: #0f766e;
        --accent-2: #1d4ed8;
        --accent-3: #c2410c;
        --error: #b91c1c;
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
        max-width: 1040px;
        margin: 0 auto;
        padding: 48px 20px 72px;
      }
      .hero { display: grid; gap: 18px; margin-bottom: 28px; }
      h1 {
        margin: 0;
        font-size: clamp(2.4rem, 6vw, 4.4rem);
        line-height: 0.95;
        letter-spacing: -0.05em;
        text-transform: uppercase;
      }
      .sub { max-width: 760px; color: var(--muted); font-size: 1.05rem; line-height: 1.6; }
      .grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; }
      .card {
        background: color-mix(in srgb, var(--panel) 92%, white 8%);
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 24px;
        box-shadow: 0 18px 40px rgba(31, 26, 23, 0.08);
      }
      .card h2 { margin: 0 0 10px; font-size: 1.2rem; }
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
      }
      .provider-chip.active {
        background: rgba(15, 118, 110, 0.1);
        border-color: rgba(15, 118, 110, 0.25);
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
      }
      button.google { background: var(--accent-2); }
      button.meta { background: var(--accent-3); }
      button.ghost {
        background: transparent;
        color: var(--text);
        border: 1px solid var(--line);
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
      }
      .account strong { display: block; margin-bottom: 6px; }
      .account small { display: block; color: var(--muted); margin-bottom: 12px; }
      .account.warning {
        border-color: rgba(194, 65, 12, 0.35);
        background: rgba(255, 247, 237, 0.92);
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
      @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="hero">
        <span class="pill">MVP Backend Page</span>
        <h1>Conectar Canais de Midia</h1>
        <p class="sub">
          Esta tela usa apenas os endpoints do backend para testar os fluxos OAuth de Google Ads e Meta Ads:
          iniciar autorizacao, concluir callback, listar contas acessiveis e selecionar a conta final.
        </p>
      </section>

      <section class="grid">
        <div class="card">
          <h2>Fluxo</h2>
          <p class="sub">
            Escolha o provider, clique em conectar e finalize o consentimento. Ao voltar, esta mesma pagina
            busca a conexao criada, lista as contas acessiveis e permite selecionar a conta final.
          </p>

          <div class="provider-tabs">
            <button id="providerGoogle" class="provider-chip active" type="button">Google Ads</button>
            <button id="providerMeta" class="provider-chip" type="button">Meta Ads</button>
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
          <h2>Conexao atual</h2>
          <div id="connectionSummary" class="sub">Nenhuma conexao selecionada.</div>
          <div class="foot">
            Callback padrao desta pagina:
            <br />
            <code id="pageUrl"></code>
          </div>
        </div>
      </section>

      <section class="card" style="margin-top: 20px;">
        <h2 id="accountsTitle">Contas acessiveis</h2>
        <div id="accounts" class="list">
          <div class="sub">As contas aparecerao aqui apos uma conexao valida.</div>
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

      pageUrlEl.textContent = window.location.origin + window.location.pathname;

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

      refreshBtn.addEventListener('click', async () => {
        try {
          setBusy(true);
          setStatus('Atualizando conexoes...');
          await loadConnectionAndAccounts(currentConnectionId);
        } catch (error) {
          setStatus(error.message || 'Erro ao atualizar conexoes.', true);
        } finally {
          setBusy(false);
        }
      });

      clearBtn.addEventListener('click', () => {
        localStorage.removeItem('googleAdsConnectionId');
        localStorage.removeItem('metaAdsConnectionId');
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
