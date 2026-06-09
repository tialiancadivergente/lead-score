import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InleadWebhookActiveCampaignLog } from '../database/entities/inlead/inlead-webhook-activecampaign-log.entity';
import { ActiveCampaignService } from '../lead-registration/services/activecampaign.service';

const MOCK_LAUNCH = 'oro';
const MOCK_SEASON = 'jun25';
const MOCK_TAG_NAME = '[ORO][JUN26][TRAFEGO]';
const MOCK_TAG_ID = '120806';

type TransformResult = {
  activeCampaignPayload: Record<string, any>;
  sourceBody: Record<string, any>;
  sourceHeaders: Record<string, any>;
};

@Injectable()
export class InleadWebhookService {
  constructor(
    private readonly activeCampaign: ActiveCampaignService,
    @InjectRepository(InleadWebhookActiveCampaignLog)
    private readonly logRepo: Repository<InleadWebhookActiveCampaignLog>,
  ) {}

  private asRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private pickString(
    obj: Record<string, any>,
    key: string,
  ): string | undefined {
    const value = obj[key];
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private normalizeEmail(email?: string) {
    const trimmed = typeof email === 'string' ? email.trim().toLowerCase() : '';
    return trimmed || undefined;
  }

  private normalizePhone(phone?: string) {
    if (typeof phone !== 'string') return undefined;
    const digits = phone.replace(/\D+/g, '');
    return digits || undefined;
  }

  private parseInteger(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) return undefined;
    return Number(trimmed);
  }

  private firstString(...values: Array<unknown>): string | undefined {
    for (const value of values) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    return undefined;
  }

  private normalizeEnvelope(rawPayload: unknown, requestHeaders: Record<string, any>) {
    const raw = Array.isArray(rawPayload) ? rawPayload[0] : rawPayload;
    const envelope = this.asRecord(raw);
    const nestedBody = this.asRecord(envelope.body);
    const sourceBody = Object.keys(nestedBody).length ? nestedBody : envelope;
    const sourceHeaders = {
      ...requestHeaders,
      ...this.asRecord(envelope.headers),
    };

    return { sourceBody, sourceHeaders };
  }

  private parseReferer(headers: Record<string, any>) {
    const referer = this.firstString(headers.referer, headers.Referer);
    if (!referer) {
      return {
        url: undefined,
        page: undefined,
        path: undefined,
      };
    }

    try {
      const parsed = new URL(referer);
      return {
        url: referer,
        page: parsed.hostname,
        path: parsed.pathname,
      };
    } catch {
      return {
        url: referer,
        page: undefined,
        path: undefined,
      };
    }
  }

  transformToActiveCampaign(
    rawPayload: unknown,
    requestHeaders: Record<string, any>,
  ): TransformResult {
    const { sourceBody, sourceHeaders } = this.normalizeEnvelope(
      rawPayload,
      requestHeaders,
    );
    const referer = this.parseReferer(sourceHeaders);

    const email = this.firstString(
      sourceBody.B02naZ,
      sourceBody.email,
      sourceBody.Email,
      sourceBody.email_address,
    );
    const telefone = this.firstString(
      sourceBody.os1ceK,
      sourceBody.telefone,
      sourceBody.phone,
      sourceBody.celular,
    );

    if (!email && !telefone) {
      throw new BadRequestException(
        'Payload sem email/telefone para envio ao ActiveCampaign.',
      );
    }

    const utms = {
      utm_source: this.firstString(
        sourceBody.utm_source,
        sourceBody['tracking.utm_source'],
      ),
      utm_medium: this.firstString(
        sourceBody.utm_medium,
        sourceBody['tracking.utm_medium'],
      ),
      utm_campaign: this.firstString(
        sourceBody.utm_campaign,
        sourceBody['tracking.utm_campaign'],
      ),
      utm_id: this.firstString(sourceBody.utm_id, sourceBody['tracking.utm_id']),
      utm_term: this.firstString(
        sourceBody.utm_term,
        sourceBody['tracking.utm_term'],
      ),
      utm_content: this.firstString(
        sourceBody.utm_content,
        sourceBody['tracking.utm_content'],
      ),
    };

    const activeCampaignPayload: Record<string, any> = {
      email,
      telefone,
      launch: MOCK_LAUNCH,
      season: MOCK_SEASON,
      tag: MOCK_TAG_NAME,
      tag_id: MOCK_TAG_ID,
      page: referer.page,
      path: referer.path,
      ...utms,
      utms,
      metadados: {
        url: referer.url,
        referer: referer.url,
        ip: this.firstString(
          sourceHeaders['x-real-ip'],
          sourceHeaders['x-forwarded-for'],
        ),
        user_agent: this.firstString(
          sourceHeaders['user-agent'],
          sourceHeaders.userAgent,
        ),
        screen: this.pickString(sourceBody, 'tracking.screen'),
        platform: this.pickString(sourceBody, 'tracking.platform'),
      },
      raw_payload: {
        source: 'inlead-webhook',
        external_code: this.pickString(sourceBody, 'code'),
        external_score: this.pickString(sourceBody, 'score'),
        body: sourceBody,
      },
    };

    return {
      activeCampaignPayload,
      sourceBody,
      sourceHeaders,
    };
  }

  private buildNormalizedPayload(payload: Record<string, any>) {
    return {
      contact: {
        email: payload.email,
        phone: payload.telefone,
        phone_normalized: this.normalizePhone(payload.telefone),
      },
      campaign: {
        launch: payload.launch,
        season: payload.season,
        tag_name: payload.tag,
        tag_id: payload.tag_id,
      },
      tracking: {
        utm_source: payload.utm_source,
        utm_medium: payload.utm_medium,
        utm_campaign: payload.utm_campaign,
        utm_id: payload.utm_id,
        utm_term: payload.utm_term,
        utm_content: payload.utm_content,
        page: payload.page,
        path: payload.path,
        referer: payload.metadados?.referer,
        ip: payload.metadados?.ip,
        user_agent: payload.metadados?.user_agent,
        screen: payload.metadados?.screen,
        platform: payload.metadados?.platform,
      },
      external: {
        code: payload.raw_payload?.external_code,
        score: this.parseInteger(payload.raw_payload?.external_score),
      },
    };
  }

  private async persistLog(params: {
    activeCampaignPayload: Record<string, any>;
    sourceBody: Record<string, any>;
    sourceHeaders: Record<string, any>;
    activeCampaignResponse?: Record<string, any>;
    status: 'sent' | 'failed';
    errorMessage?: string;
  }) {
    const payload = params.activeCampaignPayload;
    const normalizedPayload = this.buildNormalizedPayload(payload);

    const log = this.logRepo.create({
      email: this.normalizeEmail(payload.email),
      telefone: payload.telefone,
      telefone_normalizado: this.normalizePhone(payload.telefone),
      launch: MOCK_LAUNCH,
      season: MOCK_SEASON,
      tag_name: MOCK_TAG_NAME,
      tag_id: MOCK_TAG_ID,
      page: payload.page,
      path: payload.path,
      referer: payload.metadados?.referer,
      ip: payload.metadados?.ip,
      user_agent: payload.metadados?.user_agent,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      utm_id: payload.utm_id,
      utm_term: payload.utm_term,
      utm_content: payload.utm_content,
      external_code: payload.raw_payload?.external_code,
      external_score: this.parseInteger(payload.raw_payload?.external_score),
      raw_payload: {
        headers: params.sourceHeaders,
        body: params.sourceBody,
      },
      normalized_payload: normalizedPayload,
      activecampaign_response: params.activeCampaignResponse,
      status: params.status,
      error_message: params.errorMessage,
      sent_at: params.status === 'sent' ? new Date() : undefined,
    });

    return await this.logRepo.save(log);
  }

  async sendToActiveCampaign(
    rawPayload: unknown,
    requestHeaders: Record<string, any>,
  ) {
    const transformed = this.transformToActiveCampaign(
      rawPayload,
      requestHeaders,
    );
    let activeCampaign: Record<string, any> | undefined;
    let log: InleadWebhookActiveCampaignLog;

    try {
      activeCampaign = await this.activeCampaign.createContact(
        transformed.activeCampaignPayload,
      );
      log = await this.persistLog({
        ...transformed,
        activeCampaignResponse: activeCampaign,
        status: 'sent',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.persistLog({
        ...transformed,
        status: 'failed',
        errorMessage,
      });
      throw error;
    }

    return {
      sent: true,
      logId: log.id,
      launch: MOCK_LAUNCH,
      season: MOCK_SEASON,
      tag: MOCK_TAG_NAME,
      tag_id: MOCK_TAG_ID,
      mappedPayload: {
        email: transformed.activeCampaignPayload.email,
        telefone: transformed.activeCampaignPayload.telefone,
        page: transformed.activeCampaignPayload.page,
        path: transformed.activeCampaignPayload.path,
        utms: transformed.activeCampaignPayload.utms,
        metadados: transformed.activeCampaignPayload.metadados,
      },
      activeCampaign,
    };
  }
}
