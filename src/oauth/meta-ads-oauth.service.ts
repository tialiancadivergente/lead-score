import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { OAuthConnection } from '../database/entities/integrations/oauth-connection.entity';
import { OAuthState } from '../database/entities/integrations/oauth-state.entity';
import { User } from '../database/entities/system/user.entity';

type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type MetaMeResponse = {
  id: string;
  name?: string;
  email?: string;
};

type MetaAdAccount = {
  id: string;
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  business?: {
    id?: string;
    name?: string;
  };
};

type MetaAdAccountsResponse = {
  data?: MetaAdAccount[];
};

@Injectable()
export class MetaAdsOAuthService {
  private readonly provider = 'meta_ads';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(OAuthState)
    private readonly oauthStateRepository: Repository<OAuthState>,
    @InjectRepository(OAuthConnection)
    private readonly oauthConnectionRepository: Repository<OAuthConnection>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createAuthorization(params: {
    userId?: string;
    frontendRedirectUrl?: string;
  }) {
    const callbackUrl = this.getRequiredConfig('META_OAUTH_REDIRECT_URI');
    const appId = this.getRequiredConfig('META_APP_ID');

    let user: User | null = null;
    if (params.userId) {
      user = await this.userRepository.findOne({ where: { id: params.userId } });
      if (!user) {
        throw new BadRequestException('userId informado nao foi encontrado.');
      }
    }

    const scopes = this.getMetaScopes();
    const state = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const oauthState = this.oauthStateRepository.create({
      provider: this.provider,
      state,
      user: user ?? undefined,
      callback_url: callbackUrl,
      frontend_redirect_url: params.frontendRedirectUrl,
      scopes,
      expires_at: expiresAt,
      context: {
        configId: this.configService.get<string>('META_CONFIG_ID') ?? null,
      },
    });
    await this.oauthStateRepository.save(oauthState);

    const authorizationUrl = new URL(
      `https://www.facebook.com/${this.getMetaApiVersion()}/dialog/oauth`,
    );
    authorizationUrl.searchParams.set('client_id', appId);
    authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('scope', scopes.join(','));
    authorizationUrl.searchParams.set('response_type', 'code');

    const configId = this.configService.get<string>('META_CONFIG_ID');
    if (configId) {
      authorizationUrl.searchParams.set('config_id', configId);
    }

    return {
      provider: this.provider,
      authorizationUrl: authorizationUrl.toString(),
      state,
      expiresAt: expiresAt.toISOString(),
      scopes,
      configId: configId ?? null,
    };
  }

  async listAvailableAccounts(connectionId: string) {
    const connection = await this.oauthConnectionRepository.findOne({
      where: { id: connectionId, provider: this.provider },
    });

    if (!connection) {
      throw new NotFoundException('Conexao OAuth nao encontrada.');
    }

    const accessToken = this.getUsableAccessToken(connection);
    const accounts = await this.fetchAdAccounts(accessToken);

    return {
      connectionId: connection.id,
      provider: connection.provider,
      selectedAccountId: connection.external_account_id ?? null,
      selectedAccountName: connection.external_account_name ?? null,
      accounts,
    };
  }

  async selectAccount(params: {
    connectionId: string;
    accountId: string;
    accountName?: string;
  }) {
    const connection = await this.oauthConnectionRepository.findOne({
      where: { id: params.connectionId, provider: this.provider },
    });

    if (!connection) {
      throw new NotFoundException('Conexao OAuth nao encontrada.');
    }

    if (!params.accountId?.trim()) {
      throw new BadRequestException('accountId e obrigatorio.');
    }

    const accessToken = this.getUsableAccessToken(connection);
    const accounts = await this.fetchAdAccounts(accessToken);
    const normalizedAccountId = this.normalizeMetaAccountId(params.accountId);
    const account =
      accounts.find((item) => item.accountId === normalizedAccountId) ??
      accounts.find((item) => item.id === `act_${normalizedAccountId}`);

    if (!account) {
      throw new BadRequestException(
        'A conta Meta informada nao foi encontrada entre as contas acessiveis.',
      );
    }

    connection.external_account_id = account.accountId;
    connection.external_account_name =
      params.accountName?.trim() || account.name || undefined;
    connection.metadata = {
      ...(connection.metadata ?? {}),
      selectedAccount: account,
    };

    const savedConnection = await this.oauthConnectionRepository.save(connection);

    return {
      connectionId: savedConnection.id,
      provider: savedConnection.provider,
      externalAccountId: savedConnection.external_account_id ?? null,
      externalAccountName: savedConnection.external_account_name ?? null,
      metadata: savedConnection.metadata ?? null,
    };
  }

  async handleCallback(params: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
    errorReason?: string;
  }) {
    if (params.error) {
      throw new BadRequestException(
        `Meta retornou erro no consentimento: ${params.errorDescription ?? params.errorReason ?? params.error}`,
      );
    }

    if (!params.code || !params.state) {
      throw new BadRequestException('Parametros code e state sao obrigatorios.');
    }

    const oauthState = await this.oauthStateRepository.findOne({
      where: { state: params.state, provider: this.provider },
      relations: { user: true },
    });

    if (!oauthState) {
      throw new BadRequestException('State OAuth invalido ou inexistente.');
    }

    if (oauthState.consumed_at) {
      throw new BadRequestException('State OAuth ja foi utilizado.');
    }

    if (oauthState.expires_at.getTime() < Date.now()) {
      throw new BadRequestException('State OAuth expirado.');
    }

    const shortLivedToken = await this.exchangeCodeForToken(
      params.code,
      oauthState.callback_url,
    );
    const tokenPayload = await this.exchangeForLongLivedToken(
      shortLivedToken.access_token,
    );
    const me = await this.fetchMe(tokenPayload.access_token);

    oauthState.status = 'completed';
    oauthState.consumed_at = new Date();
    await this.oauthStateRepository.save(oauthState);

    const now = new Date();
    const expiresAt = tokenPayload.expires_in
      ? new Date(now.getTime() + tokenPayload.expires_in * 1000)
      : null;

    const existingConnection = await this.oauthConnectionRepository.findOne({
      where: {
        provider: this.provider,
        user: oauthState.user ? { id: oauthState.user.id } : undefined,
        external_user_id: me.id,
      },
      relations: { user: true },
    });

    const connection =
      existingConnection ??
      this.oauthConnectionRepository.create({
        provider: this.provider,
        user: oauthState.user ?? undefined,
      });

    connection.status = 'active';
    connection.external_user_id = me.id;
    connection.external_user_email = me.email;
    connection.access_token = tokenPayload.access_token;
    connection.refresh_token = undefined;
    connection.token_type = tokenPayload.token_type ?? 'bearer';
    connection.scopes = oauthState.scopes ?? [];
    connection.expires_at = expiresAt ?? undefined;
    connection.connected_at = connection.connected_at ?? now;
    connection.last_refreshed_at = now;
    connection.metadata = {
      name: me.name ?? null,
      email: me.email ?? null,
      configId: this.configService.get<string>('META_CONFIG_ID') ?? null,
      longLivedToken: true,
    };

    const savedConnection = await this.oauthConnectionRepository.save(connection);

    return {
      provider: this.provider,
      connectionId: savedConnection.id,
      userEmail: savedConnection.external_user_email ?? null,
      scopes: savedConnection.scopes ?? [],
      expiresAt: savedConnection.expires_at?.toISOString() ?? null,
      frontendRedirectUrl: oauthState.frontend_redirect_url ?? null,
      hasRefreshToken: false,
    };
  }

  private async exchangeCodeForToken(
    code: string,
    redirectUri: string,
  ): Promise<MetaTokenResponse> {
    const appId = this.getRequiredConfig('META_APP_ID');
    const appSecret = this.getRequiredConfig('META_APP_SECRET');

    const url = new URL(
      `${this.getMetaGraphBaseUrl()}/oauth/access_token`,
    );
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('code', code);

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `Falha ao trocar code por token na Meta: ${body}`,
      );
    }

    return (await response.json()) as MetaTokenResponse;
  }

  private async exchangeForLongLivedToken(
    shortLivedToken: string,
  ): Promise<MetaTokenResponse> {
    const appId = this.getRequiredConfig('META_APP_ID');
    const appSecret = this.getRequiredConfig('META_APP_SECRET');

    const url = new URL(
      `${this.getMetaGraphBaseUrl()}/oauth/access_token`,
    );
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('fb_exchange_token', shortLivedToken);

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `Falha ao trocar por long-lived token na Meta: ${body}`,
      );
    }

    return (await response.json()) as MetaTokenResponse;
  }

  private async fetchMe(accessToken: string): Promise<MetaMeResponse> {
    const url = new URL(`${this.getMetaGraphBaseUrl()}/me`);
    url.searchParams.set('fields', 'id,name,email');
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `Falha ao consultar perfil da Meta: ${body}`,
      );
    }

    return (await response.json()) as MetaMeResponse;
  }

  private async fetchAdAccounts(accessToken: string) {
    const url = new URL(`${this.getMetaGraphBaseUrl()}/me/adaccounts`);
    url.searchParams.set(
      'fields',
      'id,account_id,name,account_status,currency,timezone_name,business',
    );
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `Falha ao listar contas de anuncio da Meta: ${body}`,
      );
    }

    const payload = (await response.json()) as MetaAdAccountsResponse;
    return (payload.data ?? []).map((account) => ({
      id: account.id,
      accountId: account.account_id ?? this.normalizeMetaAccountId(account.id),
      name: account.name ?? null,
      accountStatus: account.account_status ?? null,
      currency: account.currency ?? null,
      timeZone: account.timezone_name ?? null,
      businessId: account.business?.id ?? null,
      businessName: account.business?.name ?? null,
      accessible: true,
      errorCode: null,
      errorMessage: null,
    }));
  }

  private getUsableAccessToken(connection: OAuthConnection): string {
    if (!connection.access_token) {
      throw new BadRequestException('A conexao Meta nao possui access token salvo.');
    }

    if (
      connection.expires_at &&
      connection.expires_at.getTime() <= Date.now() + 60_000
    ) {
      throw new BadRequestException(
        'O access token da Meta expirou. Reconecte a conta para continuar.',
      );
    }

    return connection.access_token;
  }

  private getMetaScopes(): string[] {
    const configured = this.configService.get<string>('META_OAUTH_SCOPES');
    if (!configured) {
      return ['ads_read', 'ads_management', 'business_management', 'email'];
    }

    return configured
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  private getMetaApiVersion(): string {
    return this.configService.get<string>('META_API_VERSION', 'v22.0');
  }

  private getMetaGraphBaseUrl(): string {
    return `https://graph.facebook.com/${this.getMetaApiVersion()}`;
  }

  private normalizeMetaAccountId(accountId: string): string {
    return accountId.replace(/^act_/, '').trim();
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new InternalServerErrorException(
        `Variavel de ambiente obrigatoria nao configurada: ${key}`,
      );
    }

    return value;
  }
}
