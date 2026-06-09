import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Capture } from '../../database/entities/capture/capture.entity';

type ActiveCampaignCreateContactResponse = Record<string, any>;
type ActiveCampaignContact = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

type ActiveCampaignApiError = {
  errors?: Array<{
    title?: string;
    detail?: string;
    code?: string;
    source?: { pointer?: string };
  }>;
};

@Injectable()
export class LeadScoreActiveCampaignService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Capture)
    private readonly captureRepo: Repository<Capture>,
  ) {}

  private pickNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  private normalizePayload(payload: Record<string, any>): {
    contact: ActiveCampaignContact;
  } {
    if (payload?.contact && typeof payload.contact === 'object') {
      return payload as { contact: ActiveCampaignContact };
    }

    const email =
      payload.email ??
      payload.Email ??
      payload.email_address ??
      payload.person?.email;
    const firstName =
      payload.firstName ??
      payload.nome ??
      payload.first_name ??
      payload.person?.nome;
    const lastName = payload.lastName ?? payload.sobrenome ?? payload.last_name;
    const phone =
      payload.phone ??
      payload.telefone ??
      payload.celular ??
      payload.person?.phone;

    return {
      contact: {
        email,
        firstName,
        lastName,
        phone,
      },
    };
  }

  private getConfig() {
    const baseUrl = this.config.get<string>('ACTIVECAMPAIGN_BASE_URL');
    const apiToken = this.config.get<string>('ACTIVECAMPAIGN_API_TOKEN');
    const createPath = this.config.get<string>(
      'ACTIVECAMPAIGN_CREATE_CONTACT_PATH',
      '/api/3/contacts',
    );

    if (!baseUrl || !apiToken) {
      throw new Error(
        'ActiveCampaign não configurado. Defina ACTIVECAMPAIGN_BASE_URL e ACTIVECAMPAIGN_API_TOKEN.',
      );
    }

    return { baseUrl, apiToken, createPath };
  }

  private async parseJsonSafe(text: string): Promise<unknown> {
    try {
      return text ? (JSON.parse(text) as unknown) : {};
    } catch {
      return { raw: text };
    }
  }

  private isDuplicateError(
    status: number,
    errBody: unknown,
  ): { duplicate: boolean; field?: 'email' | 'phone' } {
    if (status !== 422) return { duplicate: false };
    const e = errBody as ActiveCampaignApiError;
    const first = e?.errors?.[0];
    if (!first) return { duplicate: false };
    if (first.code !== 'duplicate') return { duplicate: false };

    const pointer = first.source?.pointer ?? '';
    if (pointer.includes('/data/attributes/email')) {
      return { duplicate: true, field: 'email' };
    }
    if (pointer.includes('/data/attributes/phone')) {
      return { duplicate: true, field: 'phone' };
    }
    return { duplicate: true };
  }

  private async fetchContactsByEmail(
    email: string,
  ): Promise<ActiveCampaignContact[]> {
    const { baseUrl, apiToken } = this.getConfig();

    const attempts = [
      `/api/3/contacts?email=${encodeURIComponent(email)}`,
      `/api/3/contacts?filters[email]=${encodeURIComponent(email)}`,
      `/api/3/contacts?search=${encodeURIComponent(email)}`,
    ];

    for (const path of attempts) {
      const url = new URL(path, baseUrl).toString();
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Api-Token': apiToken,
        },
      });
      const text = await res.text();
      if (!res.ok) continue;

      const json = (await this.parseJsonSafe(text)) as any;
      const contacts = Array.isArray(json?.contacts)
        ? (json.contacts as any[])
        : [];
      if (contacts.length > 0) {
        return contacts as ActiveCampaignContact[];
      }
    }

    return [];
  }

  private async fetchContactsByPhone(
    phone: string,
  ): Promise<ActiveCampaignContact[]> {
    const { baseUrl, apiToken } = this.getConfig();
    const url = new URL(
      `/api/3/contacts?search=${encodeURIComponent(phone)}`,
      baseUrl,
    ).toString();

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Api-Token': apiToken,
      },
    });
    const text = await res.text();
    if (!res.ok) return [];

    const json = (await this.parseJsonSafe(text)) as any;
    const contacts = Array.isArray(json?.contacts)
      ? (json.contacts as any[])
      : [];
    return contacts as ActiveCampaignContact[];
  }

  private async updateContact(
    contactId: string,
    contact: ActiveCampaignContact,
  ) {
    const { baseUrl, apiToken } = this.getConfig();
    const url = new URL(
      `/api/3/contacts/${encodeURIComponent(contactId)}`,
      baseUrl,
    ).toString();

    const body = {
      contact: {
        id: contactId,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
      },
    };

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Api-Token': apiToken,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`ActiveCampaign update erro ${res.status}: ${text}`);
    }

    return (await this.parseJsonSafe(
      text,
    )) as ActiveCampaignCreateContactResponse;
  }

  private async resolveCapture(
    payload: Record<string, any>,
  ): Promise<Capture | null> {
    const captureId = this.pickNonEmptyString(payload.capture_id);
    const leadRegistrationRequestId = this.pickNonEmptyString(
      payload.lead_registration_request_id,
    );

    if (captureId) {
      const capture = await this.captureRepo.findOne({
        where: { id: captureId },
      });
      if (capture) return capture;
    }

    if (!leadRegistrationRequestId) return null;

    return await this.captureRepo
      .createQueryBuilder('capture')
      .where("capture.metadata ->> 'requestId' = :requestId", {
        requestId: leadRegistrationRequestId,
      })
      .orderBy('capture.created_at', 'DESC')
      .getOne();
  }

  private mergePayloadWithCapture(
    payload: Record<string, any>,
    capture: Capture | null,
  ): Record<string, any> {
    const metadata =
      capture?.metadata && typeof capture.metadata === 'object'
        ? (capture.metadata as Record<string, any>)
        : {};

    const out = {
      ...metadata,
      ...payload,
    };

    const email =
      this.pickNonEmptyString(out.email) ??
      this.pickNonEmptyString(metadata.email) ??
      this.pickNonEmptyString(metadata.Email);
    const phone =
      this.pickNonEmptyString(out.telefone) ??
      this.pickNonEmptyString(out.phone) ??
      this.pickNonEmptyString(metadata.telefone) ??
      this.pickNonEmptyString(metadata.phone);

    if (email) out.email = email;
    if (phone) out.telefone = phone;

    return out;
  }

  async createContact(payload: Record<string, any>) {
    const capture = await this.resolveCapture(payload);
    const merged = this.mergePayloadWithCapture(payload, capture);
    const normalized = this.normalizePayload(merged);

    const email = this.pickNonEmptyString(normalized.contact.email);
    const phone = this.pickNonEmptyString(normalized.contact.phone);

    // Mantém o fluxo seguindo mesmo quando não há contato válido para envio ao AC.
    if (!email && !phone) {
      return {
        skipped: true,
        reason: 'missing-email-phone',
      };
    }

    const { baseUrl, apiToken, createPath } = this.getConfig();

    const url = new URL(createPath, baseUrl).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Token': apiToken,
      },
      body: JSON.stringify(normalized),
    });

    const text = await res.text();
    if (!res.ok) {
      const errJson = await this.parseJsonSafe(text);
      const dup = this.isDuplicateError(res.status, errJson);

      if (dup.duplicate) {
        let candidates: ActiveCampaignContact[] = [];
        if (dup.field === 'email' && email) {
          candidates = await this.fetchContactsByEmail(email);
        } else if (dup.field === 'phone' && phone) {
          candidates = await this.fetchContactsByPhone(phone);
        } else {
          if (email) candidates = await this.fetchContactsByEmail(email);
          if (candidates.length === 0 && phone) {
            candidates = await this.fetchContactsByPhone(phone);
          }
        }

        const existingId = candidates?.[0]?.id;
        if (existingId) {
          return await this.updateContact(existingId, normalized.contact);
        }
      }

      throw new Error(`ActiveCampaign erro ${res.status}: ${text}`);
    }

    return (await this.parseJsonSafe(
      text,
    )) as ActiveCampaignCreateContactResponse;
  }
}
