import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Capture } from '../../database/entities/capture/capture.entity';
import { Person } from '../../database/entities/identity/person.entity';
import { PersonIdentifier } from '../../database/entities/identity/person-identifier.entity';
import { Platform } from '../../database/entities/marketing/platform.entity';
import { Strategy } from '../../database/entities/marketing/strategy.entity';
import { Temperature } from '../../database/entities/marketing/temperature.entity';
import { Launch } from '../../database/entities/marketing/launch.entity';
import { Season } from '../../database/entities/marketing/season.entity';
import {
  IdentifierType,
  IdentifierTypeCode,
} from '../../database/entities/identity/identifier-type.entity';
import {
  IdentifierSource,
  IdentifierSourceCode,
} from '../../database/entities/identity/identifier-source.entity';
import {
  DedupeMatchLog,
  DedupeMatchedBy,
} from '../../database/entities/identity/dedupe-match-log.entity';

@Injectable()
export class LeadPersistenceService {
  constructor(
    @InjectRepository(Capture)
    private readonly captureRepo: Repository<Capture>,
  ) {}

  private pickString(
    obj: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const v = obj?.[key];
    return typeof v === 'string' ? v : undefined;
  }

  private pickNonEmptyTrimmedString(
    obj: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const v = obj?.[key];
    if (typeof v !== 'string') return undefined;
    const trimmed = v.trim();
    return trimmed ? trimmed : undefined;
  }

  private buildUtmsJsonb(
    payload: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const out: Record<string, unknown> = {};

    // Começa com o objeto "utms" (se vier) e depois sobrescreve com utm_* do topo
    const utmsRaw = payload.utms;
    if (utmsRaw && typeof utmsRaw === 'object' && !Array.isArray(utmsRaw)) {
      Object.assign(out, utmsRaw as Record<string, unknown>);
    }

    const keys = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'utm_id',
    ] as const;

    for (const k of keys) {
      const v = payload[k];
      if (typeof v === 'string') {
        out[k] = v;
      }
    }

    return Object.keys(out).length ? out : undefined;
  }

  private normalizeUtmSource(utmSource?: string): string | undefined {
    if (typeof utmSource !== 'string') return undefined;

    const value = utmSource.trim();
    if (!value) return undefined;

    const firstUnderscoreIndex = value.indexOf('_');
    if (firstUnderscoreIndex >= 0) {
      return value.slice(0, firstUnderscoreIndex + 1);
    }

    return value;
  }

  private extractAdIdFromUtmContent(utmContent?: string): string | undefined {
    if (typeof utmContent !== 'string') return undefined;

    const value = utmContent.trim();
    if (!value) return undefined;

    const fromPattern = value.match(/_id_(\d+)/i);
    if (fromPattern?.[1]) return fromPattern[1];

    if (/^\d+$/.test(value)) return value;

    return undefined;
  }

  private extractExternalAdId(
    payload: Record<string, unknown>,
  ): string | undefined {
    const utms =
      payload.utms && typeof payload.utms === 'object' && !Array.isArray(payload.utms)
        ? (payload.utms as Record<string, unknown>)
        : undefined;

    if (!utms) return undefined;

    return this.pickNonEmptyTrimmedString(utms, 'h_ad_id');
  }

  private pickTemperatureAbbreviation(
    payload: Record<string, unknown>,
  ): string | undefined {
    const fromRoot = this.pickNonEmptyTrimmedString(payload, 'temperature');
    const meta =
      payload?.metadados && typeof payload.metadados === 'object'
        ? (payload.metadados as Record<string, unknown>)
        : undefined;
    const fromMeta = meta
      ? this.pickNonEmptyTrimmedString(meta, 'temperature')
      : undefined;
    return fromRoot ?? fromMeta;
  }

  private pickLaunchCode(payload: Record<string, unknown>): string | undefined {
    const fromRoot = this.pickNonEmptyTrimmedString(payload, 'launch');
    const meta =
      payload?.metadados && typeof payload.metadados === 'object'
        ? (payload.metadados as Record<string, unknown>)
        : undefined;
    const fromMeta = meta
      ? this.pickNonEmptyTrimmedString(meta, 'launch')
      : undefined;
    return fromRoot ?? fromMeta;
  }

  private pickSeasonCode(payload: Record<string, unknown>): string | undefined {
    const fromRoot = this.pickNonEmptyTrimmedString(payload, 'season');
    const meta =
      payload?.metadados && typeof payload.metadados === 'object'
        ? (payload.metadados as Record<string, unknown>)
        : undefined;
    const fromMeta = meta
      ? this.pickNonEmptyTrimmedString(meta, 'season')
      : undefined;
    return fromRoot ?? fromMeta;
  }

  private normalizeEmail(email?: string) {
    const v = typeof email === 'string' ? email.trim().toLowerCase() : '';
    return v || undefined;
  }

  private normalizePhone(phone?: string) {
    if (typeof phone !== 'string') return undefined;
    const trimmed = phone.trim();
    if (!trimmed) return undefined;
    const hasPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/\D+/g, '');
    if (!digits) return undefined;
    return hasPlus ? `+${digits}` : digits;
  }

  private normalizeCpf(cpf?: string) {
    if (typeof cpf !== 'string') return undefined;
    const digits = cpf.replace(/\D+/g, '');
    return digits || undefined;
  }

  private sha256Hex(value: string) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private async ensureIdentifierTypes(
    repo: Repository<IdentifierType>,
    codes: IdentifierTypeCode[],
  ) {
    const rows = await repo
      .createQueryBuilder('t')
      .where('t.code IN (:...codes)', { codes })
      .getMany();

    const map = new Map<IdentifierTypeCode, IdentifierType>();
    for (const r of rows) map.set(r.code, r);

    const missing = codes.filter((c) => !map.has(c));
    if (missing.length) {
      throw new Error(
        `IdentifierType não encontrado para: ${missing.join(
          ', ',
        )}. Rode as migrations de seed.`,
      );
    }
    return map;
  }

  private async ensureIdentifierSourceForm(repo: Repository<IdentifierSource>) {
    const source = await repo.findOne({
      where: { code: IdentifierSourceCode.FORM },
    });
    if (!source) {
      throw new Error(
        'IdentifierSource FORM não encontrado. Rode as migrations de seed.',
      );
    }
    return source;
  }

  private async findPlatformBySource(
    repo: Repository<Platform>,
    source: string,
  ): Promise<Platform | null> {
    return await repo
      .createQueryBuilder('platform')
      .where('platform.source IS NOT NULL')
      .andWhere('LOWER(TRIM(platform.source)) = LOWER(TRIM(:source))', {
        source,
      })
      .getOne();
  }

  /**
   * Persistência com dedupe:
   * - cria CAPTURE
   * - associa à PERSON existente (match por PERSON_IDENTIFIER.value_hash) ou cria nova PERSON
   * - insere PERSON_IDENTIFIER que faltarem
   * - registra auditoria em DEDUPE_MATCH_LOG
   */
  async persistLead(payload: unknown) {
    const payloadObj =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const tagId = this.pickNonEmptyTrimmedString(payloadObj, 'tag_id');
    if (!tagId) {
      throw new Error('Campo obrigatório ausente: tag_id.');
    }

    const requestIdRaw = payloadObj.requestId;
    const requestId = typeof requestIdRaw === 'string' ? requestIdRaw : null;

    // Normalização/valores para dedupe
    const email = this.normalizeEmail(
      typeof payloadObj.email === 'string' ? payloadObj.email : undefined,
    );
    const phone = this.normalizePhone(
      typeof payloadObj.telefone === 'string'
        ? payloadObj.telefone
        : typeof payloadObj.phone === 'string'
          ? payloadObj.phone
          : undefined,
    );
    const cpf = this.normalizeCpf(
      typeof payloadObj.cpf === 'string' ? payloadObj.cpf : undefined,
    );

    const identifiers: Array<{
      type: IdentifierTypeCode;
      matchedBy: DedupeMatchedBy;
      normalized: string;
      hash: string;
    }> = [];
    if (email) {
      identifiers.push({
        type: IdentifierTypeCode.EMAIL,
        matchedBy: DedupeMatchedBy.EMAIL,
        normalized: email,
        hash: this.sha256Hex(email),
      });
    }
    if (phone) {
      identifiers.push({
        type: IdentifierTypeCode.PHONE,
        matchedBy: DedupeMatchedBy.PHONE,
        normalized: phone,
        hash: this.sha256Hex(phone),
      });
    }
    if (cpf) {
      identifiers.push({
        type: IdentifierTypeCode.CPF,
        matchedBy: DedupeMatchedBy.CPF,
        normalized: cpf,
        hash: this.sha256Hex(cpf),
      });
    }

    if (identifiers.length === 0) {
      throw new Error(
        'Nenhum identificador válido encontrado no payload (email/telefone/cpf).',
      );
    }

    return await this.captureRepo.manager.transaction(async (manager) => {
      const captureRepository = manager.getRepository(Capture);
      const platformRepo = manager.getRepository(Platform);
      const strategyRepo = manager.getRepository(Strategy);
      const temperatureRepo = manager.getRepository(Temperature);
      const launchRepo = manager.getRepository(Launch);
      const seasonRepo = manager.getRepository(Season);

      const resolveTemperature = async (abbreviation: string) => {
        const t = await temperatureRepo
          .createQueryBuilder('t')
          .where('LOWER(t.abbreviation) = LOWER(:abbr)', { abbr: abbreviation })
          .getOne();
        if (!t) {
          throw new Error(
            `Temperature não encontrada para abbreviation="${abbreviation}". Rode a migration de seed de temperature.`,
          );
        }
        return t;
      };

      const resolveLaunchByCode = async (code: string) => {
        const launch = await launchRepo
          .createQueryBuilder('l')
          .where('LOWER(l.name) = LOWER(:code)', { code })
          .getOne();
        if (!launch) {
          throw new Error(`Launch não encontrado para code="${code}".`);
        }
        return launch;
      };

      const resolveSeasonInLaunch = async (
        launchId: string,
        seasonCode: string,
      ) => {
        const season = await seasonRepo
          .createQueryBuilder('s')
          .leftJoin('s.launch', 'l')
          .where('l.id = :launchId', { launchId })
          .andWhere('LOWER(s.name) = LOWER(:seasonCode)', { seasonCode })
          .getOne();
        if (!season) {
          throw new Error(
            `Season não encontrada para launch_id=${launchId} e season="${seasonCode}".`,
          );
        }
        return season;
      };

      const launchCode = this.pickLaunchCode(payloadObj);
      const seasonCode = this.pickSeasonCode(payloadObj);
      if (!launchCode || !seasonCode) {
        throw new Error('Campos obrigatórios ausentes: launch e season.');
      }

      const resolvedLaunch = await resolveLaunchByCode(launchCode);
      const resolvedSeason = await resolveSeasonInLaunch(
        resolvedLaunch.id,
        seasonCode,
      );

      // Idempotência simples para retries do consumer:
      // se já existir um capture com o mesmo requestId, não cria outro.
      if (requestId) {
        const existing = await captureRepository
          .createQueryBuilder('capture')
          .where("capture.metadata ->> 'requestId' = :requestId", { requestId })
          .orderBy('capture.created_at', 'DESC')
          .getOne();

        if (existing) {
          const incomingUtmSource = this.pickString(payloadObj, 'utm_source');
          const normalizedUtmSource =
            this.normalizeUtmSource(incomingUtmSource);
          const externalAdId = this.extractExternalAdId(payloadObj);

          existing.page = this.pickString(payloadObj, 'page') ?? existing.page;
          existing.path = this.pickString(payloadObj, 'path') ?? existing.path;
          existing.utm_source = incomingUtmSource ?? existing.utm_source;
          existing.utm_medium =
            this.pickString(payloadObj, 'utm_medium') ?? existing.utm_medium;
          existing.utm_campaign =
            this.pickString(payloadObj, 'utm_campaign') ??
            existing.utm_campaign;
          existing.utm_content =
            this.pickString(payloadObj, 'utm_content') ?? existing.utm_content;
          existing.ad_id =
            this.extractAdIdFromUtmContent(
              this.pickString(payloadObj, 'utm_content'),
            ) ?? existing.ad_id;
          existing.external_ad_id = externalAdId ?? existing.external_ad_id;
          existing.utm_term =
            this.pickString(payloadObj, 'utm_term') ?? existing.utm_term;
          existing.utm_id =
            this.pickString(payloadObj, 'utm_id') ?? existing.utm_id;
          existing.tag_id =
            tagId ?? existing.tag_id;
          const utmsJsonb = this.buildUtmsJsonb(payloadObj);
          if (utmsJsonb) existing.utms = utmsJsonb;

          const tempAbbr = this.pickTemperatureAbbreviation(payloadObj);
          if (tempAbbr) {
            existing.temperature = await resolveTemperature(tempAbbr);
          }

          existing.launch = resolvedLaunch;
          existing.season = resolvedSeason;

          // Se utm_source vier preenchido, tenta resolver platform pelo "source"
          const utmSource = normalizedUtmSource;
          if (utmSource) {
            const platform = await this.findPlatformBySource(
              platformRepo,
              utmSource,
            );
            if (platform) {
              existing.platform = platform;

              const strategy = await strategyRepo
                .createQueryBuilder('s')
                .leftJoin('s.platform', 'p')
                .where('p.id = :platformId', { platformId: platform.id })
                .getOne();
              if (!strategy) {
                throw new Error(
                  `Strategy não encontrada para platform_id=${platform.id}. Rode a migration de seed de strategy.`,
                );
              }
              existing.strategy = strategy;
            }
          }

          await captureRepository.save(existing);
          return { captureId: existing.id, reused: true };
        }
      }

      // Se utm_source vier preenchido, tenta resolver platform pelo "source" (não é erro se não achar)
      const incomingUtmSource = this.pickString(payloadObj, 'utm_source');
      const normalizedUtmSource = this.normalizeUtmSource(incomingUtmSource);
      const resolvedPlatform = normalizedUtmSource
        ? await this.findPlatformBySource(platformRepo, normalizedUtmSource)
        : null;
      const resolvedStrategy = resolvedPlatform
        ? await strategyRepo
            .createQueryBuilder('s')
            .leftJoin('s.platform', 'p')
            .where('p.id = :platformId', { platformId: resolvedPlatform.id })
            .getOne()
        : null;

      if (resolvedPlatform && !resolvedStrategy) {
        throw new Error(
          `Strategy não encontrada para platform_id=${resolvedPlatform.id}. Rode a migration de seed de strategy.`,
        );
      }

      const tempAbbr = this.pickTemperatureAbbreviation(payloadObj);
      const resolvedTemperature = tempAbbr
        ? await resolveTemperature(tempAbbr)
        : null;

      // 1) cria CAPTURE primeiro
      const utmsJsonb = this.buildUtmsJsonb(payloadObj);
      const utmContent = this.pickString(payloadObj, 'utm_content');
      const externalAdId = this.extractExternalAdId(payloadObj);
      const capture = captureRepository.create({
        occurred_at: new Date(),
        page: this.pickString(payloadObj, 'page'),
        path: this.pickString(payloadObj, 'path'),
        utm_source: incomingUtmSource,
        utm_medium: this.pickString(payloadObj, 'utm_medium'),
        utm_campaign: this.pickString(payloadObj, 'utm_campaign'),
        utm_content: utmContent,
        ad_id: this.extractAdIdFromUtmContent(utmContent),
        external_ad_id: externalAdId,
        utm_term: this.pickString(payloadObj, 'utm_term'),
        utm_id: this.pickString(payloadObj, 'utm_id'),
        tag_id: tagId,
        platform: resolvedPlatform ?? undefined,
        strategy: resolvedStrategy ?? undefined,
        temperature: resolvedTemperature ?? undefined,
        launch: resolvedLaunch,
        season: resolvedSeason,
        utms: utmsJsonb,
        metadata: payloadObj,
      });
      const savedCapture = await captureRepository.save(capture);

      const personRepo = manager.getRepository(Person);
      const personIdentifierRepo = manager.getRepository(PersonIdentifier);
      const identifierTypeRepo = manager.getRepository(IdentifierType);
      const identifierSourceRepo = manager.getRepository(IdentifierSource);
      const dedupeRepo = manager.getRepository(DedupeMatchLog);

      const sourceForm =
        await this.ensureIdentifierSourceForm(identifierSourceRepo);
      const typeMap = await this.ensureIdentifierTypes(
        identifierTypeRepo,
        identifiers.map((i) => i.type),
      );

      // 2) dedupe: busca match em PERSON_IDENTIFIER por hash (prioridade: EMAIL, PHONE, CPF)
      let matchedPersonIdentifier: PersonIdentifier | null = null;
      let matchedBy: DedupeMatchedBy = DedupeMatchedBy.NONE;
      let matchedHash: string | undefined;

      for (const id of identifiers) {
        // busca por hash + tipo
        const byHash = await personIdentifierRepo
          .createQueryBuilder('pi')
          .leftJoinAndSelect('pi.person', 'person')
          .leftJoinAndSelect('pi.identifier_type', 'type')
          .where('pi.value_hash = :hash', { hash: id.hash })
          .andWhere('type.code = :code', { code: id.type })
          .getOne();

        if (byHash) {
          matchedPersonIdentifier = byHash;
          matchedBy = id.matchedBy;
          matchedHash = id.hash;
          break;
        }

        // fallback: por normalized + tipo (caso value_hash não esteja populado)
        const byNorm = await personIdentifierRepo
          .createQueryBuilder('pi')
          .leftJoinAndSelect('pi.person', 'person')
          .leftJoinAndSelect('pi.identifier_type', 'type')
          .where('pi.value_normalized = :norm', { norm: id.normalized })
          .andWhere('type.code = :code', { code: id.type })
          .getOne();

        if (byNorm) {
          matchedPersonIdentifier = byNorm;
          matchedBy = id.matchedBy;
          matchedHash = id.hash;
          break;
        }
      }

      // 3) cria ou reutiliza PERSON
      let person: Person;
      if (matchedPersonIdentifier?.person) {
        person = matchedPersonIdentifier.person;
      } else {
        person = await personRepo.save(personRepo.create({}));
        matchedBy = DedupeMatchedBy.NONE;
        matchedHash = identifiers[0]?.hash; // para auditoria, salva o primeiro hash disponível
      }

      // 4) associa CAPTURE à PERSON
      savedCapture.person = person;
      await captureRepository.save(savedCapture);

      // 5) garante PERSON_IDENTIFIER (insere os que faltarem)
      const primaryOrder: IdentifierTypeCode[] = [
        IdentifierTypeCode.EMAIL,
        IdentifierTypeCode.PHONE,
        IdentifierTypeCode.CPF,
      ];
      const primaryType =
        primaryOrder.find((t) => identifiers.some((i) => i.type === t)) ?? null;

      for (const id of identifiers) {
        const typeEntity = typeMap.get(id.type)!;

        const exists = await personIdentifierRepo
          .createQueryBuilder('pi')
          .leftJoin('pi.person', 'person')
          .leftJoin('pi.identifier_type', 'type')
          .where('person.id = :personId', { personId: person.id })
          .andWhere('type.id = :typeId', { typeId: typeEntity.id })
          .andWhere('pi.value_normalized = :norm', { norm: id.normalized })
          .getOne();

        if (exists) continue;

        await personIdentifierRepo.save(
          personIdentifierRepo.create({
            person,
            identifier_type: typeEntity,
            value_normalized: id.normalized,
            value_hash: id.hash,
            is_primary: primaryType === id.type,
          }),
        );
      }

      // 6) registra auditoria em DEDUPE_MATCH_LOG
      await dedupeRepo.save(
        dedupeRepo.create({
          person,
          capture: savedCapture,
          identifier_source: sourceForm,
          matched_by: matchedBy,
          matched_value_hash: matchedHash,
        }),
      );

      return {
        captureId: savedCapture.id,
        personId: person.id,
        reused: false,
        matchedBy,
      };
    });
  }

  async attachActiveCampaign(
    captureId: string,
    activeCampaignResponse: Record<string, any>,
  ) {
    const capture = await this.captureRepo.findOne({
      where: { id: captureId },
    });
    if (!capture) return { updated: false };

    const prev = (capture.metadata ?? {}) as Record<string, any>;
    capture.metadata = {
      ...prev,
      activeCampaign: activeCampaignResponse,
    };
    await this.captureRepo.save(capture);
    return { updated: true };
  }
}
