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

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleUserInfoResponse = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

type GoogleAccessibleCustomersResponse = {
  resourceNames?: string[];
};

type GoogleAdsSearchStreamResponse = Array<{
  results?: Array<{
    customer?: {
      resourceName?: string;
      id?: string;
      descriptiveName?: string;
      currencyCode?: string;
      timeZone?: string;
      manager?: boolean;
      testAccount?: boolean;
    };
  }>;
}>;

type GoogleAdsAccountResult = {
  resourceName: string;
  customerId: string;
  descriptiveName: string | null;
  currencyCode: string | null;
  timeZone: string | null;
  manager: boolean | null;
  testAccount: boolean | null;
  accessible: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
};

@Injectable()
export class GoogleAdsOAuthService {
  private readonly provider = 'google_ads';

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
    const callbackUrl = this.getRequiredConfig('GOOGLE_ADS_OAUTH_REDIRECT_URI');
    const clientId = this.getRequiredConfig('GOOGLE_ADS_CLIENT_ID');

    let user: User | null = null;
    if (params.userId) {
      user = await this.userRepository.findOne({ where: { id: params.userId } });
      if (!user) {
        throw new BadRequestException('userId informado nao foi encontrado.');
      }
    }

    const scopes = this.getGoogleScopes();
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
        loginCustomerId: this.configService.get<string>('GOOGLE_ADS_LOGIN_CUSTOMER_ID') ?? null,
      },
    });
    await this.oauthStateRepository.save(oauthState);

    const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', scopes.join(' '));
    authorizationUrl.searchParams.set('access_type', 'offline');
    authorizationUrl.searchParams.set('prompt', 'consent');
    authorizationUrl.searchParams.set('include_granted_scopes', 'true');
    authorizationUrl.searchParams.set('state', state);

    return {
      provider: this.provider,
      authorizationUrl: authorizationUrl.toString(),
      state,
      expiresAt: expiresAt.toISOString(),
      scopes,
    };
  }

  async listConnections(params?: { provider?: string; userId?: string }) {
    const queryBuilder = this.oauthConnectionRepository
      .createQueryBuilder('connection')
      .leftJoinAndSelect('connection.user', 'user')
      .orderBy('connection.created_at', 'DESC');

    if (params?.provider) {
      queryBuilder.andWhere('connection.provider = :provider', {
        provider: params.provider,
      });
    }

    if (params?.userId) {
      queryBuilder.andWhere('user.id = :userId', {
        userId: params.userId,
      });
    }

    const connections = await queryBuilder.getMany();

    return connections.map((connection) => ({
      id: connection.id,
      provider: connection.provider,
      status: connection.status,
      userId: connection.user?.id ?? null,
      externalUserId: connection.external_user_id ?? null,
      externalUserEmail: connection.external_user_email ?? null,
      externalAccountId: connection.external_account_id ?? null,
      externalAccountName: connection.external_account_name ?? null,
      scopes: connection.scopes ?? [],
      expiresAt: connection.expires_at?.toISOString() ?? null,
      connectedAt: connection.connected_at?.toISOString() ?? null,
      lastRefreshedAt: connection.last_refreshed_at?.toISOString() ?? null,
      createdAt: connection.created_at.toISOString(),
      updatedAt: connection.updated_at.toISOString(),
      metadata: connection.metadata ?? null,
    }));
  }

  async listAvailableAccounts(connectionId: string) {
    const connection = await this.oauthConnectionRepository.findOne({
      where: { id: connectionId, provider: this.provider },
      relations: { user: true },
    });

    if (!connection) {
      throw new NotFoundException('Conexao OAuth nao encontrada.');
    }

    const accessToken = await this.getUsableAccessToken(connection);
    const accessibleCustomers = await this.fetchAccessibleCustomers(accessToken);
    const accounts = await Promise.all(
      accessibleCustomers.map((resourceName) =>
        this.fetchCustomerDetails(accessToken, this.extractCustomerId(resourceName)),
      ),
    );

    return {
      connectionId: connection.id,
      provider: connection.provider,
      selectedAccountId: connection.external_account_id ?? null,
      selectedAccountName: connection.external_account_name ?? null,
      accounts,
    };
  }

  async getAuthorizedAccessTokenForConnection(
    connectionId: string,
  ): Promise<string> {
    const connection = await this.oauthConnectionRepository.findOne({
      where: { id: connectionId, provider: this.provider },
    });

    if (!connection) {
      throw new NotFoundException('Conexao OAuth nao encontrada.');
    }

    return this.getUsableAccessToken(connection);
  }

  getConfiguredLoginCustomerId(): string | null {
    return this.normalizeOptionalCustomerId(
      this.configService.get<string>('GOOGLE_ADS_LOGIN_CUSTOMER_ID'),
    );
  }

  getGoogleAdsBaseUrl(): string {
    return this.getGoogleAdsApiBaseUrl();
  }

  async selectAccount(params: {
    connectionId: string;
    customerId: string;
    customerName?: string;
  }) {
    const connection = await this.oauthConnectionRepository.findOne({
      where: { id: params.connectionId, provider: this.provider },
    });

    if (!connection) {
      throw new NotFoundException('Conexao OAuth nao encontrada.');
    }

    if (!params.customerId?.trim()) {
      throw new BadRequestException('customerId e obrigatorio.');
    }

    const accessToken = await this.getUsableAccessToken(connection);
    const customerId = this.normalizeCustomerId(params.customerId);
    const customer =
      params.customerName && params.customerName.trim()
        ? {
            customerId,
            descriptiveName: params.customerName.trim(),
          }
        : await this.fetchCustomerDetails(accessToken, customerId);

    connection.external_account_id = customer.customerId;
    connection.external_account_name = customer.descriptiveName ?? undefined;
    connection.updated_at = new Date();
    connection.metadata = {
      ...(connection.metadata ?? {}),
      selectedAccount: customer,
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
  }) {
    if (params.error) {
      throw new BadRequestException(
        `Google retornou erro no consentimento: ${params.errorDescription ?? params.error}`,
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

    const tokenPayload = await this.exchangeCodeForToken(
      params.code,
      oauthState.callback_url,
    );
    const userInfo = await this.fetchUserInfo(tokenPayload.access_token);

    oauthState.status = 'completed';
    oauthState.consumed_at = new Date();
    await this.oauthStateRepository.save(oauthState);

    const now = new Date();
    const expiresAt = tokenPayload.expires_in
      ? new Date(now.getTime() + tokenPayload.expires_in * 1000)
      : null;
    const scopes = this.extractScopes(tokenPayload.scope, oauthState.scopes);

    const existingConnection = await this.oauthConnectionRepository.findOne({
      where: {
        provider: this.provider,
        user: oauthState.user ? { id: oauthState.user.id } : undefined,
        external_user_id: userInfo.sub,
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
    connection.external_user_id = userInfo.sub;
    connection.external_user_email = userInfo.email;
    connection.access_token = tokenPayload.access_token;
    connection.refresh_token =
      tokenPayload.refresh_token ?? connection.refresh_token;
    connection.token_type = tokenPayload.token_type;
    connection.scopes = scopes;
    connection.expires_at = expiresAt ?? undefined;
    connection.connected_at = connection.connected_at ?? now;
    connection.last_refreshed_at = now;
    connection.metadata = {
      emailVerified: userInfo.email_verified ?? null,
      name: userInfo.name ?? null,
      picture: userInfo.picture ?? null,
      developerTokenConfigured: Boolean(
        this.configService.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN'),
      ),
      loginCustomerId:
        this.configService.get<string>('GOOGLE_ADS_LOGIN_CUSTOMER_ID') ?? null,
    };

    const savedConnection =
      await this.oauthConnectionRepository.save(connection);

    return {
      provider: this.provider,
      connectionId: savedConnection.id,
      userEmail: savedConnection.external_user_email ?? null,
      scopes: savedConnection.scopes ?? [],
      expiresAt: savedConnection.expires_at?.toISOString() ?? null,
      frontendRedirectUrl: oauthState.frontend_redirect_url ?? null,
      hasRefreshToken: Boolean(savedConnection.refresh_token),
      loginCustomerId:
        this.configService.get<string>('GOOGLE_ADS_LOGIN_CUSTOMER_ID') ?? null,
    };
  }

  private async exchangeCodeForToken(
    code: string,
    redirectUri: string,
  ): Promise<GoogleTokenResponse> {
    const clientId = this.getRequiredConfig('GOOGLE_ADS_CLIENT_ID');
    const clientSecret = this.getRequiredConfig('GOOGLE_ADS_CLIENT_SECRET');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `Falha ao trocar code por token no Google: ${body}`,
      );
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<GoogleTokenResponse> {
    const clientId = this.getRequiredConfig('GOOGLE_ADS_CLIENT_ID');
    const clientSecret = this.getRequiredConfig('GOOGLE_ADS_CLIENT_SECRET');

    const response = await fetch('https://www.googleapis.com/oauth2/v3/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `Falha ao renovar access token do Google: ${body}`,
      );
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfoResponse> {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `Falha ao consultar userinfo do Google: ${body}`,
      );
    }

    return (await response.json()) as GoogleUserInfoResponse;
  }

  private getGoogleScopes(): string[] {
    const configured = this.configService.get<string>('GOOGLE_ADS_OAUTH_SCOPES');
    if (!configured) {
      return [
        'https://www.googleapis.com/auth/adwords',
        'openid',
        'email',
        'profile',
      ];
    }

    return configured
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  private async getUsableAccessToken(connection: OAuthConnection): Promise<string> {
    const expiresAt = connection.expires_at?.getTime() ?? 0;
    const now = Date.now();
    const hasValidAccessToken =
      Boolean(connection.access_token) && (!expiresAt || expiresAt > now + 60_000);

    if (hasValidAccessToken && connection.access_token) {
      return connection.access_token;
    }

    if (!connection.refresh_token) {
      throw new BadRequestException(
        'A conexao nao possui refresh token para renovar o access token.',
      );
    }

    const tokenPayload = await this.refreshAccessToken(connection.refresh_token);
    const refreshedAt = new Date();
    connection.access_token = tokenPayload.access_token;
    connection.token_type = tokenPayload.token_type ?? connection.token_type;
    connection.last_refreshed_at = refreshedAt;
    connection.expires_at = tokenPayload.expires_in
      ? new Date(refreshedAt.getTime() + tokenPayload.expires_in * 1000)
      : connection.expires_at;
    connection.scopes = this.extractScopes(tokenPayload.scope, connection.scopes);

    await this.oauthConnectionRepository.save(connection);

    return connection.access_token;
  }

  private async fetchAccessibleCustomers(accessToken: string): Promise<string[]> {
    const response = await fetch(
      `${this.getGoogleAdsApiBaseUrl()}/customers:listAccessibleCustomers`,
      {
        method: 'GET',
        headers: this.buildGoogleAdsHeaders(accessToken, false),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `Falha ao listar contas acessiveis no Google Ads: ${body}`,
      );
    }

    const payload =
      (await response.json()) as GoogleAccessibleCustomersResponse;

    return payload.resourceNames ?? [];
  }

  private async fetchCustomerDetails(accessToken: string, customerId: string) {
    try {
      const response = await fetch(
        `${this.getGoogleAdsApiBaseUrl()}/customers/${customerId}/googleAds:searchStream`,
        {
          method: 'POST',
          headers: this.buildGoogleAdsHeaders(accessToken, true),
          body: JSON.stringify({
            query:
              'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager, customer.test_account FROM customer LIMIT 1',
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        return this.buildInaccessibleAccount(customerId, body);
      }

      const payload =
        (await response.json()) as GoogleAdsSearchStreamResponse;
      const customer = payload.flatMap((chunk) => chunk.results ?? [])[0]?.customer;

      return {
        resourceName: customer?.resourceName ?? `customers/${customerId}`,
        customerId: customer?.id ?? customerId,
        descriptiveName: customer?.descriptiveName ?? null,
        currencyCode: customer?.currencyCode ?? null,
        timeZone: customer?.timeZone ?? null,
        manager: customer?.manager ?? null,
        testAccount: customer?.testAccount ?? null,
        accessible: true,
        errorCode: null,
        errorMessage: null,
      } satisfies GoogleAdsAccountResult;
    } catch (error) {
      return {
        resourceName: `customers/${customerId}`,
        customerId,
        descriptiveName: null,
        currencyCode: null,
        timeZone: null,
        manager: null,
        testAccount: null,
        accessible: false,
        errorCode: 'UNEXPECTED_ERROR',
        errorMessage:
          error instanceof Error ? error.message : 'Erro inesperado ao consultar conta.',
      } satisfies GoogleAdsAccountResult;
    }
  }

  private buildGoogleAdsHeaders(accessToken: string, includeLoginCustomerId: boolean) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'developer-token': this.getRequiredConfig('GOOGLE_ADS_DEVELOPER_TOKEN'),
    };

    const loginCustomerId = this.normalizeOptionalCustomerId(
      this.configService.get<string>('GOOGLE_ADS_LOGIN_CUSTOMER_ID'),
    );

    if (includeLoginCustomerId && loginCustomerId) {
      headers['login-customer-id'] = loginCustomerId;
    }

    return headers;
  }

  private getGoogleAdsApiBaseUrl(): string {
    const version = this.configService.get<string>('GOOGLE_ADS_API_VERSION', 'v20');
    return `https://googleads.googleapis.com/${version}`;
  }

  private extractCustomerId(resourceName: string): string {
    return resourceName.replace('customers/', '').trim();
  }

  private normalizeCustomerId(customerId: string): string {
    return customerId.replace(/-/g, '').trim();
  }

  private normalizeOptionalCustomerId(customerId?: string): string | null {
    if (!customerId?.trim()) {
      return null;
    }

    return this.normalizeCustomerId(customerId);
  }

  private buildInaccessibleAccount(
    customerId: string,
    responseBody: string,
  ): GoogleAdsAccountResult {
    let errorCode: string | null = null;
    let errorMessage: string | null = null;

    try {
      const parsed = JSON.parse(responseBody) as {
        error?: {
          message?: string;
          details?: Array<{
            errors?: Array<{
              errorCode?: Record<string, string>;
              message?: string;
            }>;
          }>;
        };
      };

      errorMessage = parsed.error?.message ?? null;
      const firstError = parsed.error?.details?.[0]?.errors?.[0];
      const firstErrorCode = firstError?.errorCode
        ? Object.values(firstError.errorCode)[0]
        : null;
      errorCode = firstErrorCode ?? null;
      errorMessage = firstError?.message ?? errorMessage;
    } catch {
      errorMessage = responseBody;
    }

    return {
      resourceName: `customers/${customerId}`,
      customerId,
      descriptiveName: null,
      currencyCode: null,
      timeZone: null,
      manager: null,
      testAccount: null,
      accessible: false,
      errorCode,
      errorMessage,
    };
  }

  private extractScopes(scopeString?: string, fallback?: string[]): string[] {
    if (scopeString?.trim()) {
      return scopeString
        .split(' ')
        .map((scope) => scope.trim())
        .filter(Boolean);
    }

    return fallback ?? [];
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
