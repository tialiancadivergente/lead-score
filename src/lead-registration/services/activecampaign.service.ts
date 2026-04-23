import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ActiveCampaignCreateContactResponse = Record<string, any>;
type ActiveCampaignCreateContactTagResponse = Record<string, any>;
type ActiveCampaignFieldValue = {
  field: string;
  value: string;
};

type ActiveCampaignContact = {
  id?: string;
  email?: string;
  phone?: string;
  fieldValues?: ActiveCampaignFieldValue[];
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
export class ActiveCampaignService {
  constructor(private readonly config: ConfigService) {}

  private pickNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  private extractCustomFields(payload: Record<string, any>): Record<string, any> {
    const utmsRaw =
      payload?.utms && typeof payload.utms === 'object' && !Array.isArray(payload.utms)
        ? (payload.utms as Record<string, any>)
        : {};

    const out: Record<string, any> = {};

    const fallbackKeys: Array<
      'utm_source' | 'utm_campaign' | 'utm_medium' | 'utm_term' | 'utm_content'
    > = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content'];

    for (const key of fallbackKeys) {
      if (utmsRaw[key] !== undefined) {
        out[key] = utmsRaw[key];
        continue;
      }
      if (payload[key] !== undefined) {
        out[key] = payload[key];
      }
    }

    if (utmsRaw.slogan !== undefined) {
      out.slogan = utmsRaw.slogan;
    } else if (payload.slogan !== undefined) {
      out.slogan = payload.slogan;
    } else if (payload.path !== undefined) {
      out.slogan = payload.path;
    }

    if (utmsRaw.lp !== undefined) {
      out.lp = utmsRaw.lp;
    } else if (payload.lp !== undefined) {
      out.lp = payload.lp;
    } else if (payload.tag_id !== undefined) {
      out.lp = payload.tag_id;
    }

    return out;
  }

  private normalizePayload(payload: Record<string, any>): { contact: ActiveCampaignContact } {
    const payloadContact =
      payload?.contact &&
      typeof payload.contact === 'object' &&
      !Array.isArray(payload.contact)
        ? (payload.contact as Record<string, any>)
        : {};

    const email =
      this.pickNonEmptyString(payloadContact.email) ??
      this.pickNonEmptyString(payload.email) ??
      this.pickNonEmptyString(payload.Email) ??
      this.pickNonEmptyString(payload.email_address);

    const phone =
      this.pickNonEmptyString(payloadContact.phone) ??
      this.pickNonEmptyString(payload.phone) ??
      this.pickNonEmptyString(payload.telefone) ??
      this.pickNonEmptyString(payload.celular);

    const customFields = this.extractCustomFields(payload);

    // Primeiro: todos os pares de customFields viram itens em fieldValues
    const fieldValues: ActiveCampaignFieldValue[] = Object.entries(customFields).map(
      ([fieldId, value]) => ({
        field: String(fieldId),
        value: value === null || value === undefined ? '' : String(value),
      }),
    );

    // Depois: so campos padrao mapeados para chaves de customFields
    const standardFieldMap: Record<string, string> = {
      '1': 'utm_source',
      '2': 'utm_campaign',
      '3': 'utm_medium',
      '4': 'utm_term',
      '5': 'utm_content',
      '134': 'slogan',
      '210': 'slogan',
      '53': 'lp',
    };

    const newFieldValues: ActiveCampaignFieldValue[] = [];

    for (const [fieldId, customFieldKey] of Object.entries(standardFieldMap)) {
      const fieldExists = fieldValues.some((item) => item.field === fieldId);
      const value = customFields[customFieldKey];

      if (!fieldExists && value) {
        newFieldValues.push({
          field: fieldId,
          value: String(value),
        });
      }
    }

    return {
      contact: {
        email,
        phone,
        // Regra final: substitui pelo array newFieldValues
        fieldValues: newFieldValues,
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
    const contactTagPath = this.config.get<string>(
      'ACTIVECAMPAIGN_CREATE_CONTACT_TAG_PATH',
      '/api/3/contactTags',
    );

    if (!baseUrl || !apiToken) {
      throw new Error(
        'ActiveCampaign nao configurado. Defina ACTIVECAMPAIGN_BASE_URL e ACTIVECAMPAIGN_API_TOKEN.',
      );
    }

    return { baseUrl, apiToken, createPath, contactTagPath };
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

  private isDuplicateTagError(status: number, errBody: unknown): boolean {
    if (status !== 409 && status !== 422) return false;

    const body = errBody as Record<string, any>;
    const firstError = Array.isArray(body?.errors)
      ? (body.errors[0] as Record<string, any> | undefined)
      : undefined;
    const code = String(firstError?.code ?? '').toLowerCase();
    const title = String(firstError?.title ?? '').toLowerCase();
    const detail = String(firstError?.detail ?? '').toLowerCase();
    const raw = JSON.stringify(errBody).toLowerCase();

    return (
      code.includes('duplicate') ||
      title.includes('already') ||
      detail.includes('already') ||
      raw.includes('duplicate') ||
      raw.includes('already')
    );
  }

  private extractContactIdFromResponse(
    response: unknown,
    fallbackId?: string,
  ): string | undefined {
    if (typeof fallbackId === 'string' && fallbackId.trim()) {
      return fallbackId.trim();
    }

    const asRecord =
      response && typeof response === 'object'
        ? (response as Record<string, any>)
        : undefined;
    if (!asRecord) return undefined;

    const directId = this.pickNonEmptyString(asRecord.id);
    if (directId) return directId;

    const contactObj =
      asRecord.contact && typeof asRecord.contact === 'object'
        ? (asRecord.contact as Record<string, any>)
        : undefined;
    const contactId = this.pickNonEmptyString(contactObj?.id);
    if (contactId) return contactId;

    const contacts = Array.isArray(asRecord.contacts)
      ? (asRecord.contacts as Array<Record<string, any>>)
      : [];
    const firstFromContacts = this.pickNonEmptyString(contacts[0]?.id);
    if (firstFromContacts) return firstFromContacts;

    if (Array.isArray(response)) {
      const first = response[0] as Record<string, any> | undefined;
      const firstId = this.pickNonEmptyString(first?.id);
      if (firstId) return firstId;
    }

    return undefined;
  }

  private async createContactTag(contactId: string, tagId: string) {
    const { baseUrl, apiToken, contactTagPath } = this.getConfig();
    const url = new URL(contactTagPath, baseUrl).toString();

    const body = {
      contactTag: {
        contact: String(contactId),
        tag: String(tagId),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Api-Token': apiToken,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      const errJson = await this.parseJsonSafe(text);
      if (this.isDuplicateTagError(res.status, errJson)) {
        return {
          skipped: true,
          reason: 'duplicate-tag',
        };
      }

      throw new Error(`ActiveCampaign contactTag erro ${res.status}: ${text}`);
    }

    return (await this.parseJsonSafe(
      text,
    )) as ActiveCampaignCreateContactTagResponse;
  }

  private async attachTagFromPayload(
    payload: Record<string, any>,
    contactResponse: unknown,
    fallbackContactId?: string,
  ) {
    const tagId = this.pickNonEmptyString(payload?.tag_id ?? payload?.tagId);
    if (!tagId) {
      return {
        skipped: true,
        reason: 'missing-tag-id',
      };
    }

    const contactId = this.extractContactIdFromResponse(
      contactResponse,
      fallbackContactId,
    );
    if (!contactId) {
      return {
        skipped: true,
        reason: 'missing-contact-id',
      };
    }

    return await this.createContactTag(contactId, tagId);
  }

  private async fetchContactsByEmail(email: string): Promise<ActiveCampaignContact[]> {
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

  private async fetchContactsByPhone(phone: string): Promise<ActiveCampaignContact[]> {
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

  private async updateContact(contactId: string, contact: ActiveCampaignContact) {
    const { baseUrl, apiToken } = this.getConfig();
    const url = new URL(
      `/api/3/contacts/${encodeURIComponent(contactId)}`,
      baseUrl,
    ).toString();

    const body = {
      contact: {
        id: contactId,
        email: contact.email,
        phone: contact.phone,
        fieldValues: contact.fieldValues ?? [],
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

    return (await this.parseJsonSafe(text)) as ActiveCampaignCreateContactResponse;
  }

  async createContact(payload: Record<string, any>) {
    const { baseUrl, apiToken, createPath } = this.getConfig();

    const url = new URL(createPath, baseUrl).toString();
    const normalized = this.normalizePayload(payload);

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

      // Se ja existir, tenta resolver via update do contato existente
      if (dup.duplicate) {
        const email = normalized.contact.email;
        const phone = normalized.contact.phone;

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
          const updated = await this.updateContact(existingId, normalized.contact);
          const contactTag = await this.attachTagFromPayload(
            payload,
            updated,
            existingId,
          );

          if (updated && typeof updated === 'object' && !Array.isArray(updated)) {
            return {
              ...(updated as Record<string, any>),
              contactTag,
            };
          }
          return {
            contact: updated,
            contactTag,
          };
        }
      }

      throw new Error(`ActiveCampaign erro ${res.status}: ${text}`);
    }

    const json = (await this.parseJsonSafe(text)) as ActiveCampaignCreateContactResponse;
    const contactTag = await this.attachTagFromPayload(payload, json);

    if (json && typeof json === 'object' && !Array.isArray(json)) {
      return {
        ...(json as Record<string, any>),
        contactTag,
      };
    }
    return {
      contact: json,
      contactTag,
    };
  }
}
