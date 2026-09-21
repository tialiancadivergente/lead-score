import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import type { Stream, Writable } from 'stream';
import { once } from 'events';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Capture } from '../database/entities/capture/capture.entity';
import {
  CaptureExportFormat,
  CaptureExportJob,
} from '../database/entities/capture/capture-export-job.entity';
import { ServiceBusService } from '../service-bus/service-bus.service';
import { FormAnswer } from '../database/entities/form/form-answer.entity';
import { FormResponse } from '../database/entities/form/form-response.entity';
import { LeadscoreResult } from '../database/entities/leadscore/leadscore-result.entity';
import { PersonIdentifier } from '../database/entities/identity/person-identifier.entity';
import { CaptureExportStorageService } from './capture-export-storage.service';
import {
  CaptureQuizAnswerItemDto,
  CaptureQuizAnswersResponseDto,
} from './dto/capture-quiz-answers-response.dto';
import { CaptureFilterQueryDto } from './dto/capture-filter-query.dto';
import { ListCaptureQueryDto } from './dto/list-capture-query.dto';
import {
  CaptureListItemDto,
  CaptureListResponseDto,
} from './dto/list-capture-response.dto';
import { CaptureSyncQueryDto } from './dto/capture-sync-query.dto';
import { CaptureSyncResponseDto } from './dto/capture-sync-response.dto';
import { CaptureSyncQuestionsResponseDto } from './dto/capture-sync-questions-response.dto';
import { ActiveCampaignGapQueryDto } from './dto/activecampaign-gap-query.dto';
import { ActiveCampaignGapResponseDto } from './dto/activecampaign-gap-response.dto';
import { ActiveCampaignMissingContactsQueryDto } from './dto/activecampaign-missing-contacts-query.dto';
import {
  ActiveCampaignMissingContactItemDto,
  ActiveCampaignMissingContactsResponseDto,
} from './dto/activecampaign-missing-contacts-response.dto';
import {
  ActiveCampaignContactTagStatus,
  ActiveCampaignContactTagsQueryDto,
} from './dto/activecampaign-contact-tags-query.dto';
import {
  ActiveCampaignContactTagItemDto,
  ActiveCampaignContactTagsResponseDto,
} from './dto/activecampaign-contact-tags-response.dto';

type CaptureFilters = {
  startDate?: Date;
  endDate?: Date;
  launchId?: string;
  temperatureId?: string;
  seasonId?: string;
  quizAnswered?: boolean;
  email?: string;
  phone?: string;
};

type CaptureFilterQuery = Pick<
  CaptureFilterQueryDto,
  | 'start_date'
  | 'end_date'
  | 'launch_id'
  | 'temperature_id'
  | 'season_id'
  | 'quiz_answered'
  | 'email'
  | 'phone'
>;

export const CAPTURE_EXPORT_QUEUE =
  process.env.SERVICE_BUS_CAPTURE_EXPORT_QUEUE ?? 'capture-export';

type CaptureRawRow = {
  id: string;
  page: string | null;
  path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  utm_id: string | null;
  created_at: Date | string;
  form_version_id: string | null;
  person_id: string | null;
  name: string | null;
  capture_email: string | null;
  capture_phone: string | null;
  platform_id: string | null;
  platform_name: string | null;
  strategy_id: string | null;
  strategy_name: string | null;
  temperature_id: string | null;
  temperature_name: string | null;
  launch_id: string | null;
  launch_name: string | null;
  season_id: string | null;
  season_name: string | null;
  tag_id: string;
  tag_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  external_ad_id: string | null;
  external_ad_name: string | null;
  activecampaign_contact_id: string | null;
};

type PersonIdentifierRawRow = {
  person_id: string;
  type_code: 'EMAIL' | 'PHONE';
  value_normalized: string;
};

type CaptureExportColumn = {
  key: keyof CaptureListItemDto;
  header: string;
};

type CaptureQuizExportDetail = {
  quiz_answered: boolean;
  score_total: number | null;
  faixa: string | null;
  quiz_answers: string | null;
};

type FormResponseCaptureRawRow = {
  form_response_id: string;
  capture_id: string;
};

type LeadscoreResultRawRow = {
  form_response_id: string;
  score_total: number | null;
  faixa: string | null;
};

type FormAnswerRawRow = {
  form_response_id: string;
  question_key: string | null;
  question_text: string | null;
  option_text: string | null;
  answer_text: string | null;
  answer_number: number | null;
  answer_bool: boolean | null;
};

type ActiveCampaignMissingContactRawRow = {
  capture_id: string;
  created_at: Date | string;
  tag_id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  page: string | null;
  path: string | null;
};

type ActiveCampaignContactTagRawRow = ActiveCampaignMissingContactRawRow & {
  status: string;
  reason: string | null;
  activecampaign_contact_id: string | null;
  contact_tag: Record<string, any> | null;
};

@Injectable()
export class CaptureService {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private static readonly PERSON_CONTACTS_BATCH_SIZE = 2000;
  private static readonly EXPORT_BATCH_SIZE = 2000;
  private static readonly SYNC_DEFAULT_LIMIT = 500;
  private static readonly RESERVED_SYNC_FIELD_NAMES = new Set<string>([
    'id',
    'page',
    'path',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'utm_id',
    'created_at',
    'quiz_answered',
    'score_total',
    'faixa',
    'quiz_answers',
    'person_id',
    'name',
    'person_email',
    'person_phone',
    'platform_id',
    'platform_name',
    'strategy_id',
    'strategy_name',
    'temperature_id',
    'temperature_name',
    'launch_id',
    'launch_name',
    'season_id',
    'season_name',
    'tag_id',
    'tag_name',
    'ad_id',
    'ad_name',
    'external_ad_id',
    'external_ad_name',
  ]);
  private static readonly EXPORT_COLUMNS: CaptureExportColumn[] = [
    { key: 'id', header: 'id' },
    { key: 'page', header: 'page' },
    { key: 'path', header: 'path' },
    { key: 'utm_source', header: 'utm_source' },
    { key: 'utm_medium', header: 'utm_medium' },
    { key: 'utm_campaign', header: 'utm_campaign' },
    { key: 'utm_content', header: 'utm_content' },
    { key: 'utm_term', header: 'utm_term' },
    { key: 'utm_id', header: 'utm_id' },
    { key: 'created_at', header: 'created_at' },
    { key: 'quiz_answered', header: 'Quiz respondido?' },
    { key: 'score_total', header: 'score_total' },
    { key: 'faixa', header: 'faixa' },
    { key: 'name', header: 'name' },
    { key: 'person_email', header: 'person_email' },
    { key: 'person_phone', header: 'person_phone' },
    { key: 'platform_name', header: 'platform_name' },
    { key: 'strategy_name', header: 'strategy_name' },
    { key: 'temperature_name', header: 'temperature_name' },
    { key: 'launch_name', header: 'launch' },
    { key: 'season_name', header: 'season' },
    { key: 'tag_id', header: 'tag_id' },
    { key: 'ad_id', header: 'ad_id' },
    { key: 'external_ad_id', header: 'external_ad_id' },
    { key: 'activecampaign_contact_id', header: 'activecampaign_contact_id' },
  ];

  private readonly logger = new Logger(CaptureService.name);

  constructor(
    @InjectRepository(Capture)
    private readonly captureRepo: Repository<Capture>,
    @InjectRepository(PersonIdentifier)
    private readonly personIdentifierRepo: Repository<PersonIdentifier>,
    @InjectRepository(FormResponse)
    private readonly formResponseRepo: Repository<FormResponse>,
    @InjectRepository(FormAnswer)
    private readonly formAnswerRepo: Repository<FormAnswer>,
    @InjectRepository(LeadscoreResult)
    private readonly leadscoreResultRepo: Repository<LeadscoreResult>,
    @InjectRepository(CaptureExportJob)
    private readonly exportJobRepo: Repository<CaptureExportJob>,
    private readonly serviceBus: ServiceBusService,
    private readonly exportStorage: CaptureExportStorageService,
  ) {}

  async getCaptureQuizAnswers(
    captureId: string,
  ): Promise<CaptureQuizAnswersResponseDto> {
    const capture = await this.captureRepo.findOne({
      where: { id: captureId },
      relations: ['form_version'],
    });
    if (!capture) {
      throw new NotFoundException(
        `Capture nao encontrada para id=${captureId}.`,
      );
    }

    const formResponse = await this.formResponseRepo
      .createQueryBuilder('fr')
      .leftJoinAndSelect('fr.form_version', 'form_version')
      .where('fr.capture_id = :captureId', { captureId })
      .orderBy('fr.submitted_at', 'DESC')
      .addOrderBy('fr.created_at', 'DESC')
      .getOne();

    if (!formResponse) {
      return {
        capture_id: captureId,
        quiz_answered: false,
        score_total: null,
        faixa: null,
        form_version_id: capture.form_version?.id ?? null,
        form_response_id: null,
        submitted_at: null,
        answers: [],
      };
    }

    const formAnswers = await this.formAnswerRepo
      .createQueryBuilder('fa')
      .leftJoinAndSelect('fa.question', 'question')
      .leftJoinAndSelect('fa.option', 'option')
      .where('fa.form_response_id = :formResponseId', {
        formResponseId: formResponse.id,
      })
      .orderBy('question.question_key', 'ASC')
      .addOrderBy('fa.created_at', 'ASC')
      .getMany();

    const answers: CaptureQuizAnswerItemDto[] = formAnswers.map((row) => ({
      form_answer_id: row.id,
      question_id: row.question.id,
      question_key: row.question.question_key ?? null,
      question_text: row.question.question_text ?? null,
      input_type: row.question.input_type ?? null,
      option_id: row.option?.id ?? null,
      option_key: row.option?.option_key ?? null,
      option_text: row.option?.option_text ?? null,
      answer_text: row.answer_text ?? null,
      answer_number: row.answer_number ?? null,
      answer_bool: row.answer_bool ?? null,
      answered_at: row.answered_at ? row.answered_at.toISOString() : null,
    }));

    const leadscoreResult = await this.leadscoreResultRepo.findOne({
      where: { form_response: { id: formResponse.id } },
      relations: ['tier'],
      order: { created_at: 'DESC' },
    });

    return {
      capture_id: captureId,
      quiz_answered: true,
      score_total: leadscoreResult?.score_total ?? null,
      faixa: leadscoreResult?.tier?.name ?? null,
      form_version_id: formResponse.form_version?.id ?? null,
      form_response_id: formResponse.id,
      submitted_at: formResponse.submitted_at
        ? formResponse.submitted_at.toISOString()
        : null,
      answers,
    };
  }

  async listCaptures(
    query: ListCaptureQueryDto,
  ): Promise<CaptureListResponseDto> {
    const startedAt = Date.now();
    const page = this.parsePositiveInt(query.page, 1, 'page');
    const perPage = Math.min(
      this.parsePositiveInt(query.per_page, 50, 'per_page'),
      200,
    );
    this.logger.log(
      `List capture started (page=${page}, per_page=${perPage}).`,
    );

    const filters = this.parseFilters(query);

    const countQb = this.captureRepo.createQueryBuilder('capture');
    this.applyFilters(countQb, filters);

    const dataQb = this.buildDataQuery(filters, { page, perPage });

    const [rows, totalItems] = await Promise.all([
      dataQb.getRawMany<CaptureRawRow>(),
      countQb.getCount(),
    ]);

    const items = await this.mapRowsToItems(rows);

    this.logger.log(
      `List capture finished in ${Date.now() - startedAt}ms (items=${items.length}, total=${totalItems}).`,
    );

    return {
      items,
      meta: {
        page,
        per_page: perPage,
        total_items: totalItems,
        total_pages: totalItems > 0 ? Math.ceil(totalItems / perPage) : 0,
      },
    };
  }

  async getActiveCampaignGap(
    query: ActiveCampaignGapQueryDto,
  ): Promise<ActiveCampaignGapResponseDto> {
    const tagId = this.parseRequiredString(query.tag_id, 'tag_id');
    const startDate = this.parseDateBoundary(
      query.start_date,
      false,
      'start_date',
    );
    const endDate = this.parseDateBoundary(query.end_date, true, 'end_date');

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        'start_date deve ser menor ou igual a end_date.',
      );
    }

    const activeCampaignContactExpression =
      "COALESCE(NULLIF(TRIM(capture.activecampaign_contact_id), ''), NULLIF(TRIM(capture.metadata #>> '{activeCampaign,contact,id}'), ''))";

    const qb = this.captureRepo
      .createQueryBuilder('capture')
      .select('COUNT(*)::int', 'total_leads')
      .addSelect(
        `COUNT(*) FILTER (WHERE ${activeCampaignContactExpression} IS NOT NULL)::int`,
        'leads_with_activecampaign_contact',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE ${activeCampaignContactExpression} IS NULL)::int`,
        'leads_without_activecampaign_contact',
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE NULLIF(TRIM(capture.activecampaign_contact_id), '') IS NOT NULL)::int",
        'leads_with_activecampaign_contact_id_column',
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE NULLIF(TRIM(capture.activecampaign_contact_id), '') IS NULL AND NULLIF(TRIM(capture.metadata #>> '{activeCampaign,contact,id}'), '') IS NOT NULL)::int",
        'leads_missing_column_but_with_metadata_contact',
      )
      .where('capture.tag_id = :tagId', { tagId });

    if (startDate) {
      qb.andWhere('capture.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('capture.created_at <= :endDate', { endDate });
    }

    const row = await qb.getRawOne<{
      total_leads: number | string | null;
      leads_with_activecampaign_contact: number | string | null;
      leads_without_activecampaign_contact: number | string | null;
      leads_with_activecampaign_contact_id_column: number | string | null;
      leads_missing_column_but_with_metadata_contact: number | string | null;
    }>();

    return {
      tag_id: tagId,
      start_date: startDate ? startDate.toISOString() : null,
      end_date: endDate ? endDate.toISOString() : null,
      total_leads: this.toNumber(row?.total_leads),
      leads_with_activecampaign_contact: this.toNumber(
        row?.leads_with_activecampaign_contact,
      ),
      leads_without_activecampaign_contact: this.toNumber(
        row?.leads_without_activecampaign_contact,
      ),
      leads_with_activecampaign_contact_id_column: this.toNumber(
        row?.leads_with_activecampaign_contact_id_column,
      ),
      leads_missing_column_but_with_metadata_contact: this.toNumber(
        row?.leads_missing_column_but_with_metadata_contact,
      ),
    };
  }

  async listActiveCampaignMissingContacts(
    query: ActiveCampaignMissingContactsQueryDto,
  ): Promise<ActiveCampaignMissingContactsResponseDto> {
    const tagId = this.parseRequiredString(query.tag_id, 'tag_id');
    const startDate = this.parseDateBoundary(
      query.start_date,
      false,
      'start_date',
    );
    const endDate = this.parseDateBoundary(query.end_date, true, 'end_date');
    const page = this.parsePositiveInt(query.page, 1, 'page');
    const perPage = Math.min(
      this.parsePositiveInt(query.per_page, 50, 'per_page'),
      200,
    );

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        'start_date deve ser menor ou igual a end_date.',
      );
    }

    const countQb = this.buildActiveCampaignMissingContactsBaseQuery(
      tagId,
      startDate,
      endDate,
    );
    const dataQb = this.buildActiveCampaignMissingContactsBaseQuery(
      tagId,
      startDate,
      endDate,
    )
      .leftJoin('capture.person', 'person')
      .select([
        'capture.id AS capture_id',
        'capture.created_at AS created_at',
        'capture.tag_id AS tag_id',
        'capture.page AS page',
        'capture.path AS path',
        'person.nome_consolidado AS name',
      ])
      .addSelect("NULLIF(TRIM(capture.metadata ->> 'email'), '')", 'email')
      .addSelect(
        "NULLIF(TRIM(COALESCE(capture.metadata ->> 'telefone', capture.metadata ->> 'phone')), '')",
        'phone',
      )
      .orderBy('capture.created_at', 'DESC')
      .addOrderBy('capture.id', 'DESC')
      .offset((page - 1) * perPage)
      .limit(perPage);

    const [totalItems, rows] = await Promise.all([
      countQb.getCount(),
      dataQb.getRawMany<ActiveCampaignMissingContactRawRow>(),
    ]);

    const items: ActiveCampaignMissingContactItemDto[] = rows.map((row) => ({
      capture_id: row.capture_id,
      created_at: this.toIsoString(row.created_at),
      tag_id: row.tag_id,
      email: row.email,
      phone: row.phone,
      name: row.name,
      page: row.page,
      path: row.path,
    }));

    return {
      tag_id: tagId,
      start_date: startDate ? startDate.toISOString() : null,
      end_date: endDate ? endDate.toISOString() : null,
      items,
      meta: {
        page,
        per_page: perPage,
        total_items: totalItems,
        total_pages: totalItems > 0 ? Math.ceil(totalItems / perPage) : 0,
      },
    };
  }

  async listActiveCampaignContactTags(
    query: ActiveCampaignContactTagsQueryDto,
  ): Promise<ActiveCampaignContactTagsResponseDto> {
    const tagId = this.parseRequiredString(query.tag_id, 'tag_id');
    const startDate = this.parseDateBoundary(
      query.start_date,
      false,
      'start_date',
    );
    const endDate = this.parseDateBoundary(query.end_date, true, 'end_date');
    const status = this.parseActiveCampaignContactTagStatus(query.status);
    const page = this.parsePositiveInt(query.page, 1, 'page');
    const perPage = Math.min(
      this.parsePositiveInt(query.per_page, 50, 'per_page'),
      200,
    );

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        'start_date deve ser menor ou igual a end_date.',
      );
    }

    const summaryQb = this.buildActiveCampaignContactTagsBaseQuery(
      tagId,
      startDate,
      endDate,
    )
      .select(
        `COALESCE(NULLIF(TRIM(capture.metadata #>> '{activeCampaign,contactTag,reason}'), ''), 'success')`,
        'status',
      )
      .addSelect('COUNT(*)::int', 'total')
      .groupBy('status')
      .orderBy('total', 'DESC');

    const countQb = this.buildActiveCampaignContactTagsBaseQuery(
      tagId,
      startDate,
      endDate,
      status,
    );

    const dataQb = this.buildActiveCampaignContactTagsBaseQuery(
      tagId,
      startDate,
      endDate,
      status,
    )
      .leftJoin('capture.person', 'person')
      .select([
        'capture.id AS capture_id',
        'capture.created_at AS created_at',
        'capture.tag_id AS tag_id',
        'capture.page AS page',
        'capture.path AS path',
        'person.nome_consolidado AS name',
      ])
      .addSelect(
        `COALESCE(NULLIF(TRIM(capture.metadata #>> '{activeCampaign,contactTag,reason}'), ''), 'success')`,
        'status',
      )
      .addSelect(
        "NULLIF(TRIM(capture.metadata #>> '{activeCampaign,contactTag,reason}'), '')",
        'reason',
      )
      .addSelect(
        "COALESCE(NULLIF(TRIM(capture.activecampaign_contact_id), ''), NULLIF(TRIM(capture.metadata #>> '{activeCampaign,contact,id}'), ''))",
        'activecampaign_contact_id',
      )
      .addSelect("NULLIF(TRIM(capture.metadata ->> 'email'), '')", 'email')
      .addSelect(
        "NULLIF(TRIM(COALESCE(capture.metadata ->> 'telefone', capture.metadata ->> 'phone')), '')",
        'phone',
      )
      .addSelect(
        "capture.metadata -> 'activeCampaign' -> 'contactTag'",
        'contact_tag',
      )
      .orderBy('capture.created_at', 'DESC')
      .addOrderBy('capture.id', 'DESC')
      .offset((page - 1) * perPage)
      .limit(perPage);

    const [summaryRows, totalItems, rows] = await Promise.all([
      summaryQb.getRawMany<{ status: string; total: number | string }>(),
      countQb.getCount(),
      dataQb.getRawMany<ActiveCampaignContactTagRawRow>(),
    ]);

    const items: ActiveCampaignContactTagItemDto[] = rows.map((row) => ({
      capture_id: row.capture_id,
      created_at: this.toIsoString(row.created_at),
      tag_id: row.tag_id,
      status: row.status,
      reason: row.reason,
      activecampaign_contact_id: row.activecampaign_contact_id,
      email: row.email,
      phone: row.phone,
      name: row.name,
      page: row.page,
      path: row.path,
      contact_tag: row.contact_tag,
    }));

    return {
      tag_id: tagId,
      start_date: startDate ? startDate.toISOString() : null,
      end_date: endDate ? endDate.toISOString() : null,
      status: status ?? null,
      summary: summaryRows.map((row) => ({
        status: row.status,
        total: this.toNumber(row.total),
      })),
      items,
      meta: {
        page,
        per_page: perPage,
        total_items: totalItems,
        total_pages: totalItems > 0 ? Math.ceil(totalItems / perPage) : 0,
      },
    };
  }

  // @deprecated: prefer createExportJob + polling for anything but small exports; this blocks on the HTTP request.
  async exportCapturesCsv(query: CaptureFilterQueryDto): Promise<string> {
    const startedAt = Date.now();
    this.logger.log('Capture CSV export started.');

    const { items, questionHeaders, answersByCapture } =
      await this.buildExportDataset(query);
    const csv = this.buildExportCsvBuffer(
      items,
      questionHeaders,
      answersByCapture,
    ).toString('utf-8');

    this.logger.log(
      `Capture CSV export finished in ${Date.now() - startedAt}ms (items=${items.length}).`,
    );

    return csv;
  }

  // @deprecated: prefer createExportJob + polling for anything but small exports; this blocks on the HTTP request.
  async exportCapturesExcel(query: CaptureFilterQueryDto): Promise<Buffer> {
    const startedAt = Date.now();
    this.logger.log('Capture Excel export started.');

    const { items, questionHeaders, answersByCapture } =
      await this.buildExportDataset(query);
    const out = await this.buildExportExcelBuffer(
      items,
      questionHeaders,
      answersByCapture,
    );

    this.logger.log(
      `Capture Excel export finished in ${Date.now() - startedAt}ms (items=${items.length}).`,
    );

    return out;
  }

  async streamCapturesExcel(
    query: CaptureFilterQueryDto,
    stream: Stream,
    onProgress?: (processed: number) => Promise<void>,
  ): Promise<void> {
    const startedAt = Date.now();
    this.logger.log('Capture Excel stream export started.');

    const filters = this.parseFilters(query);
    const questionHeaders = await this.collectExportQuestionHeaders(filters);
    const columns = CaptureService.EXPORT_COLUMNS;
    const headers = [
      ...columns.map((column) => column.header),
      ...questionHeaders,
    ];
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream,
      useStyles: true,
      useSharedStrings: false,
    });
    const worksheet = workbook.addWorksheet('captures');

    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: 24,
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.commit();

    let cursor: { createdAt: Date; id: string } | undefined;
    let processed = 0;

    for (;;) {
      const rows = await this.buildExportBatchQuery(
        filters,
        cursor,
        CaptureService.EXPORT_BATCH_SIZE,
      ).getRawMany<CaptureRawRow>();

      if (!rows.length) break;

      const { detailsByCapture, answersByCapture } =
        await this.resolveQuizExportData(rows.map((row) => row.id));
      const items = await this.mapRowsToItems(rows, detailsByCapture);
      this.addExportExcelRows(
        worksheet,
        items,
        questionHeaders,
        answersByCapture,
      );

      processed += rows.length;
      await onProgress?.(processed);
      const lastRow = rows[rows.length - 1];
      const lastCreatedAt =
        lastRow.created_at instanceof Date
          ? lastRow.created_at
          : new Date(lastRow.created_at);
      cursor = { createdAt: lastCreatedAt, id: lastRow.id };

      if (rows.length < CaptureService.EXPORT_BATCH_SIZE) break;
    }

    await worksheet.commit();
    await workbook.commit();

    this.logger.log(
      `Capture Excel stream export finished in ${Date.now() - startedAt}ms (items=${processed}).`,
    );
  }

  async streamCapturesCsv(
    query: CaptureFilterQueryDto,
    stream: Writable,
    onProgress?: (processed: number) => Promise<void>,
  ): Promise<void> {
    const startedAt = Date.now();
    this.logger.log('Capture CSV stream export started.');

    const filters = this.parseFilters(query);
    const questionHeaders = await this.collectExportQuestionHeaders(filters);
    const columns = CaptureService.EXPORT_COLUMNS;
    const headerRow = [
      ...columns.map((column) => column.header),
      ...questionHeaders,
    ];

    await this.writeStreamChunk(
      stream,
      `\uFEFF${headerRow.map((value) => this.escapeCsv(value)).join(',')}\r\n`,
    );

    let cursor: { createdAt: Date; id: string } | undefined;
    let processed = 0;
    let firstDataRow = true;

    for (;;) {
      const rows = await this.buildExportBatchQuery(
        filters,
        cursor,
        CaptureService.EXPORT_BATCH_SIZE,
      ).getRawMany<CaptureRawRow>();

      if (!rows.length) break;

      const { detailsByCapture, answersByCapture } =
        await this.resolveQuizExportData(rows.map((row) => row.id));
      const items = await this.mapRowsToItems(rows, detailsByCapture);

      for (const item of items) {
        const baseColumns = columns.map((column) =>
          this.toExportCaptureValue(item, column.key),
        );
        const answerMap = answersByCapture.get(item.id);
        const questionColumns = questionHeaders.map((questionHeader) =>
          this.toExportString(answerMap?.get(questionHeader) ?? ''),
        );
        const line = [...baseColumns, ...questionColumns]
          .map((value) => this.escapeCsv(value))
          .join(',');
        await this.writeStreamChunk(
          stream,
          `${firstDataRow ? '' : '\r\n'}${line}`,
        );
        firstDataRow = false;
      }

      processed += rows.length;
      await onProgress?.(processed);

      const lastRow = rows[rows.length - 1];
      const lastCreatedAt =
        lastRow.created_at instanceof Date
          ? lastRow.created_at
          : new Date(lastRow.created_at);
      cursor = { createdAt: lastCreatedAt, id: lastRow.id };

      if (rows.length < CaptureService.EXPORT_BATCH_SIZE) break;
    }

    this.logger.log(
      `Capture CSV stream export finished in ${Date.now() - startedAt}ms (items=${processed}).`,
    );
  }

  async createExportJob(
    query: CaptureFilterQueryDto,
    format: CaptureExportFormat,
  ): Promise<CaptureExportJob> {
    this.parseFilters(query);

    const job = await this.exportJobRepo.save(
      this.exportJobRepo.create({
        format,
        filters: { ...query },
        status: 'pending',
        processed_items: 0,
      }),
    );

    if (this.serviceBus.isEnabled()) {
      await this.serviceBus.publish(
        CAPTURE_EXPORT_QUEUE,
        { jobId: job.id },
        { subject: 'capture-export' },
      );
    } else {
      void this.processExportJob(job.id, query, format);
    }

    return job;
  }

  async processExportJobById(jobId: string): Promise<void> {
    const job = await this.getExportJobStatus(jobId);
    await this.processExportJob(
      job.id,
      job.filters as CaptureFilterQueryDto,
      job.format,
    );
  }

  async getExportJobStatus(jobId: string): Promise<CaptureExportJob> {
    const job = await this.exportJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(
        `Job de export nao encontrado para id=${jobId}.`,
      );
    }
    return job;
  }

  async getExportJobFile(jobId: string): Promise<{
    fileName: string;
    contentType: string;
    stream: Readable;
  }> {
    const job = await this.getExportJobStatus(jobId);
    if (job.status !== 'completed') {
      throw new ConflictException(
        `Job ${jobId} ainda nao foi concluido (status=${job.status}).`,
      );
    }

    const contentType =
      job.content_type ??
      (job.format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv; charset=utf-8');

    if (job.file_path && job.file_storage && job.file_storage !== 'database') {
      const stream = await this.exportStorage.openReadStream({
        storage: job.file_storage,
        path: job.file_path,
      });

      return {
        fileName: job.file_name ?? `capture-export.${job.format}`,
        contentType,
        stream,
      };
    }

    if (!job.file_data) {
      throw new ConflictException(`Job ${jobId} nao possui arquivo gerado.`);
    }

    return {
      fileName: job.file_name ?? `capture-export.${job.format}`,
      contentType,
      stream: Readable.from(job.file_data),
    };
  }

  async listCapturesForSync(
    query: CaptureSyncQueryDto,
  ): Promise<CaptureSyncResponseDto> {
    const filters = this.parseFilters(query);
    const cursor = this.parseSyncCursor(query.since_created_at, query.since_id);
    const fieldMap = this.parseFieldMap(query.map);

    if (fieldMap.length && !filters.launchId) {
      throw new BadRequestException(
        'map exige launch_id (question_key nao e estavel entre lancamentos diferentes).',
      );
    }

    const limit = this.parseSyncLimit(query.limit);

    const rows = await this.buildExportBatchQuery(
      filters,
      cursor,
      limit + 1,
      'asc',
    ).getRawMany<CaptureRawRow>();

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const { detailsByCapture } = await this.resolveQuizExportData(
      pageRows.map((row) => row.id),
    );
    const items = await this.mapRowsToItems(pageRows, detailsByCapture);

    if (fieldMap.length) {
      const answerValues = await this.resolveQuizAnswerValuesByQuestionKey(
        pageRows.map((row) => row.id),
        fieldMap.map((entry) => entry.questionKey),
      );

      for (const item of items) {
        const itemAnswers = answerValues.get(item.id);
        const itemRecord = item as unknown as Record<string, string | null>;
        for (const { fieldName, questionKey } of fieldMap) {
          itemRecord[fieldName] = itemAnswers?.get(questionKey) ?? null;
        }
      }
    }

    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor = lastRow
      ? { created_at: this.toIsoString(lastRow.created_at), id: lastRow.id }
      : null;

    return {
      items: items as Array<CaptureListItemDto & Record<string, string | null>>,
      next_cursor: nextCursor,
      has_more: hasMore,
    };
  }

  async listAvailableQuizQuestions(
    launchId: string,
  ): Promise<CaptureSyncQuestionsResponseDto> {
    const rows = await this.formAnswerRepo
      .createQueryBuilder('fa')
      .innerJoin('fa.question', 'question')
      .innerJoin('fa.form_response', 'fr')
      .innerJoin('fr.capture', 'capture')
      .distinct(true)
      .select([
        'question.question_key AS question_key',
        'question.question_text AS question_text',
      ])
      .where('capture.launch_id = :launchId', { launchId })
      .orderBy('question.question_key', 'ASC')
      .getRawMany<{ question_key: string; question_text: string | null }>();

    return { questions: rows };
  }

  private parseSyncCursor(
    sinceCreatedAt: string | undefined,
    sinceId: string | undefined,
  ): { createdAt: Date; id: string } | undefined {
    if (!sinceCreatedAt && !sinceId) return undefined;
    if (!sinceCreatedAt || !sinceId) {
      throw new BadRequestException(
        'since_created_at e since_id devem ser informados juntos.',
      );
    }

    const createdAt = new Date(sinceCreatedAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw new BadRequestException('since_created_at invalido. Use ISO 8601.');
    }
    this.parseUuid(sinceId, 'since_id');

    return { createdAt, id: sinceId };
  }

  private parseSyncLimit(limit: string | undefined): number {
    if (!limit) return CaptureService.SYNC_DEFAULT_LIMIT;
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException('limit deve ser um inteiro >= 1.');
    }
    return Math.min(parsed, CaptureService.EXPORT_BATCH_SIZE);
  }

  private async processExportJob(
    jobId: string,
    query: CaptureFilterQueryDto,
    format: CaptureExportFormat,
  ): Promise<void> {
    const startedAt = Date.now();
    this.logger.log(`Capture export job ${jobId} started (format=${format}).`);

    try {
      const claim = await this.exportJobRepo.update(
        { id: jobId, status: 'pending' },
        {
          status: 'processing',
          started_at: new Date(),
          error_message: null,
        },
      );

      if (!claim.affected) {
        const current = await this.getExportJobStatus(jobId);
        this.logger.warn(
          `Capture export job ${jobId} ignored because status=${current.status}.`,
        );
        return;
      }

      await this.exportJobRepo.update(jobId, {
        status: 'processing',
        started_at: new Date(),
      });

      const filters = this.parseFilters(query);

      const countQb = this.captureRepo.createQueryBuilder('capture');
      this.applyFilters(countQb, filters);
      const totalItems = await countQb.getCount();
      await this.exportJobRepo.update(jobId, { total_items: totalItems });

      const fileName = this.buildExportFileName(format);
      const contentType = this.getExportContentType(format);
      const storedFile = await this.exportStorage.writeFile(
        fileName,
        contentType,
        async (stream) => {
          const onProgress = (processed: number) =>
            this.exportJobRepo
              .update(jobId, { processed_items: processed })
              .then(() => undefined);

          if (format === 'xlsx') {
            await this.streamCapturesExcel(query, stream, onProgress);
            return;
          }

          await this.streamCapturesCsv(query, stream, onProgress);
        },
      );

      await this.exportJobRepo.update(jobId, {
        status: 'completed',
        completed_at: new Date(),
        file_name: fileName,
        file_storage: storedFile.storage,
        file_path: storedFile.path,
        content_type: storedFile.contentType,
        file_size: String(storedFile.size),
        expires_at: storedFile.expiresAt,
        file_data: null,
      });

      this.logger.log(
        `Capture export job ${jobId} finished in ${Date.now() - startedAt}ms (items=${totalItems}, bytes=${storedFile.size}).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Capture export job ${jobId} failed: ${message}`);
      await this.exportJobRepo.update(jobId, {
        status: 'failed',
        error_message: message,
        completed_at: new Date(),
      });
    }
  }

  private buildExportFileName(extension: 'csv' | 'xlsx'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `capture-export-${timestamp}.${extension}`;
  }

  private getExportContentType(format: CaptureExportFormat): string {
    return format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv; charset=utf-8';
  }

  private buildExportCsvBuffer(
    items: CaptureListItemDto[],
    questionHeaders: string[],
    answersByCapture: Map<string, Map<string, string>>,
  ): Buffer {
    const columns = CaptureService.EXPORT_COLUMNS;
    const headerRow = [
      ...columns.map((column) => column.header),
      ...questionHeaders,
    ];
    const dataRows = items.map((item) => {
      const baseColumns = columns.map((column) =>
        this.toExportCaptureValue(item, column.key),
      );
      const answerMap = answersByCapture.get(item.id);
      const questionColumns = questionHeaders.map((questionHeader) =>
        this.toExportString(answerMap?.get(questionHeader) ?? ''),
      );
      return [...baseColumns, ...questionColumns];
    });

    const csv = [headerRow, ...dataRows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\r\n');

    return Buffer.from(`\uFEFF${csv}`, 'utf-8');
  }

  private async buildExportExcelBuffer(
    items: CaptureListItemDto[],
    questionHeaders: string[],
    answersByCapture: Map<string, Map<string, string>>,
  ): Promise<Buffer> {
    const columns = CaptureService.EXPORT_COLUMNS;
    const headers = [
      ...columns.map((column) => column.header),
      ...questionHeaders,
    ];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('captures');

    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: 24,
    }));

    this.addExportExcelRows(
      worksheet,
      items,
      questionHeaders,
      answersByCapture,
    );

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.commit?.();

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  }

  private async writeStreamChunk(
    stream: Writable,
    chunk: string | Buffer,
  ): Promise<void> {
    if (stream.write(chunk)) return;
    await once(stream, 'drain');
  }

  private addExportExcelRows(
    worksheet: ExcelJS.Worksheet,
    items: CaptureListItemDto[],
    questionHeaders: string[],
    answersByCapture: Map<string, Map<string, string>>,
  ): void {
    const columns = CaptureService.EXPORT_COLUMNS;

    for (const item of items) {
      const baseColumns = columns.map((column) =>
        this.toExportCaptureValue(item, column.key),
      );
      const answerMap = answersByCapture.get(item.id);
      const questionColumns = questionHeaders.map((questionHeader) =>
        this.toExportString(answerMap?.get(questionHeader) ?? ''),
      );
      const row = worksheet.addRow([...baseColumns, ...questionColumns]);
      row.commit?.();
    }
  }

  private parsePositiveInt(
    value: string | undefined,
    defaultValue: number,
    fieldName: string,
  ): number {
    if (!value) return defaultValue;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${fieldName} deve ser um inteiro >= 1.`);
    }
    return parsed;
  }

  private parseRequiredString(
    value: string | undefined,
    fieldName: string,
  ): string {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) {
      throw new BadRequestException(`${fieldName} e obrigatorio.`);
    }
    return normalized;
  }

  private parseActiveCampaignContactTagStatus(
    value: string | undefined,
  ): ActiveCampaignContactTagStatus | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();
    const allowed: ActiveCampaignContactTagStatus[] = [
      'success',
      'tag-not-found',
      'duplicate-tag',
      'missing-tag-id',
      'missing-contact-id',
      'skipped',
    ];
    if (!allowed.includes(normalized as ActiveCampaignContactTagStatus)) {
      throw new BadRequestException(
        `status invalido. Use: ${allowed.join(', ')}.`,
      );
    }
    return normalized as ActiveCampaignContactTagStatus;
  }

  private parseFilters(query: CaptureFilterQuery): CaptureFilters {
    const filters: CaptureFilters = {
      startDate: this.parseDateBoundary(query.start_date, false, 'start_date'),
      endDate: this.parseDateBoundary(query.end_date, true, 'end_date'),
      launchId: this.parseUuid(query.launch_id, 'launch_id'),
      temperatureId: this.parseUuid(query.temperature_id, 'temperature_id'),
      seasonId: this.parseUuid(query.season_id, 'season_id'),
      quizAnswered: this.parseBoolean(query.quiz_answered, 'quiz_answered'),
      email: this.normalizeEmail(query.email),
      phone: this.normalizePhone(query.phone, 'phone'),
    };

    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      throw new BadRequestException(
        'start_date deve ser menor ou igual a end_date.',
      );
    }

    return filters;
  }

  private parseUuid(
    value: string | undefined,
    fieldName: string,
  ): string | undefined {
    if (!value) return undefined;
    if (!CaptureService.UUID_REGEX.test(value)) {
      throw new BadRequestException(`${fieldName} deve ser um UUID valido.`);
    }
    return value;
  }

  private parseBoolean(
    value: string | undefined,
    fieldName: string,
  ): boolean | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    throw new BadRequestException(
      `${fieldName} invalido. Use true/false (ou 1/0).`,
    );
  }

  private parseFieldMap(
    mapParam: string | undefined,
  ): Array<{ fieldName: string; questionKey: string }> {
    if (!mapParam || !mapParam.trim()) return [];

    const seenFieldNames = new Set<string>();
    const entries = mapParam.split(',').map((pair) => {
      const [fieldNameRaw, questionKeyRaw] = pair.split(':');
      const fieldName = fieldNameRaw?.trim();
      const questionKey = questionKeyRaw?.trim();

      if (!fieldName || !questionKey) {
        throw new BadRequestException(
          `map invalido. Use o formato "campo:question_key,campo2:question_key2" (recebido: "${pair}").`,
        );
      }
      if (CaptureService.RESERVED_SYNC_FIELD_NAMES.has(fieldName)) {
        throw new BadRequestException(
          `map invalido: "${fieldName}" ja e um campo padrao da resposta e nao pode ser usado como nome de campo.`,
        );
      }
      if (seenFieldNames.has(fieldName)) {
        throw new BadRequestException(
          `map invalido: campo "${fieldName}" duplicado.`,
        );
      }
      seenFieldNames.add(fieldName);

      return { fieldName, questionKey };
    });

    return entries;
  }

  private normalizeEmail(value: string | undefined): string | undefined {
    const normalized =
      typeof value === 'string' ? value.trim().toLowerCase() : '';
    return normalized || undefined;
  }

  private normalizePhone(
    value: string | undefined,
    fieldName: string,
  ): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const hasPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/\D+/g, '');
    if (!digits) {
      throw new BadRequestException(`${fieldName} deve conter digitos.`);
    }

    return hasPlus ? `+${digits}` : digits;
  }

  private parseDateBoundary(
    value: string | undefined,
    isEnd: boolean,
    fieldName: string,
  ): Date | undefined {
    if (!value) return undefined;

    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}${isEnd ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
      : value;

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        `${fieldName} invalido. Use ISO 8601 (YYYY-MM-DD ou datetime).`,
      );
    }
    return parsed;
  }

  private buildActiveCampaignMissingContactsBaseQuery(
    tagId: string,
    startDate: Date | undefined,
    endDate: Date | undefined,
  ): SelectQueryBuilder<Capture> {
    const activeCampaignContactExpression =
      "COALESCE(NULLIF(TRIM(capture.activecampaign_contact_id), ''), NULLIF(TRIM(capture.metadata #>> '{activeCampaign,contact,id}'), ''))";

    const qb = this.captureRepo
      .createQueryBuilder('capture')
      .where('capture.tag_id = :tagId', { tagId })
      .andWhere(`${activeCampaignContactExpression} IS NULL`);

    if (startDate) {
      qb.andWhere('capture.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('capture.created_at <= :endDate', { endDate });
    }

    return qb;
  }

  private buildActiveCampaignContactTagsBaseQuery(
    tagId: string,
    startDate: Date | undefined,
    endDate: Date | undefined,
    status?: ActiveCampaignContactTagStatus,
  ): SelectQueryBuilder<Capture> {
    const reasonExpression =
      "NULLIF(TRIM(capture.metadata #>> '{activeCampaign,contactTag,reason}'), '')";

    const qb = this.captureRepo
      .createQueryBuilder('capture')
      .where('capture.tag_id = :tagId', { tagId })
      .andWhere("capture.metadata ? 'activeCampaign'")
      .andWhere("(capture.metadata -> 'activeCampaign') ? 'contactTag'");

    if (startDate) {
      qb.andWhere('capture.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('capture.created_at <= :endDate', { endDate });
    }

    if (status === 'success') {
      qb.andWhere(`${reasonExpression} IS NULL`);
    } else if (status === 'skipped') {
      qb.andWhere(`${reasonExpression} IS NOT NULL`);
    } else if (status) {
      qb.andWhere(`${reasonExpression} = :contactTagStatus`, {
        contactTagStatus: status,
      });
    }

    return qb;
  }

  private buildDataQuery(
    filters: CaptureFilters,
    pagination?: { page: number; perPage: number },
  ): SelectQueryBuilder<Capture> {
    const externalAdExpression =
      "COALESCE(capture.utms ->> 'h_ad_id', capture.metadata -> 'utms' ->> 'h_ad_id', capture.metadata ->> 'h_ad_id')";
    const captureEmailExpression =
      "NULLIF(TRIM(capture.metadata ->> 'email'), '')";
    const capturePhoneExpression =
      "NULLIF(TRIM(COALESCE(capture.metadata ->> 'telefone', capture.metadata ->> 'phone')), '')";

    const qb = this.captureRepo
      .createQueryBuilder('capture')
      .leftJoin('capture.person', 'person')
      .leftJoin('capture.platform', 'platform')
      .leftJoin('capture.strategy', 'strategy')
      .leftJoin('capture.temperature', 'temperature')
      .leftJoin('capture.launch', 'launch')
      .leftJoin('capture.season', 'season')
      .select([
        'capture.id AS id',
        'capture.page AS page',
        'capture.path AS path',
        'capture.utm_source AS utm_source',
        'capture.utm_medium AS utm_medium',
        'capture.utm_campaign AS utm_campaign',
        'capture.utm_content AS utm_content',
        'capture.utm_term AS utm_term',
        'capture.utm_id AS utm_id',
        'capture.created_at AS created_at',
        'capture.form_version_id AS form_version_id',
        'capture.person_id AS person_id',
        'person.nome_consolidado AS name',
        'capture.platform_id AS platform_id',
        'capture.strategy_id AS strategy_id',
        'capture.temperature_id AS temperature_id',
        'capture.launch_id AS launch_id',
        'capture.season_id AS season_id',
        'capture.tag_id AS tag_id',
        'capture.ad_id AS ad_id',
        'capture.activecampaign_contact_id AS activecampaign_contact_id',
        'platform.name AS platform_name',
        'strategy.name AS strategy_name',
        'temperature.name AS temperature_name',
        'launch.name AS launch_name',
        'season.name AS season_name',
        'capture.tag_id AS tag_name',
        'capture.ad_id AS ad_name',
      ])
      .addSelect(externalAdExpression, 'external_ad_id')
      .addSelect(externalAdExpression, 'external_ad_name')
      .addSelect(captureEmailExpression, 'capture_email')
      .addSelect(capturePhoneExpression, 'capture_phone')
      .orderBy('capture.created_at', 'DESC')
      .addOrderBy('capture.id', 'DESC');

    this.applyFilters(qb, filters);

    if (pagination) {
      qb.offset((pagination.page - 1) * pagination.perPage).limit(
        pagination.perPage,
      );
    }

    return qb;
  }

  private buildExportBatchQuery(
    filters: CaptureFilters,
    after: { createdAt: Date; id: string } | undefined,
    limit: number,
    direction: 'asc' | 'desc' = 'desc',
  ): SelectQueryBuilder<Capture> {
    const qb = this.buildDataQuery(filters);
    const order = direction === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy('capture.created_at', order).addOrderBy('capture.id', order);

    if (after) {
      const operator = direction === 'asc' ? '>' : '<';
      qb.andWhere(
        `(capture.created_at, capture.id) ${operator} (:cursorCreatedAt, :cursorId)`,
        { cursorCreatedAt: after.createdAt, cursorId: after.id },
      );
    }

    return qb.limit(limit);
  }

  private applyFilters(
    qb: SelectQueryBuilder<Capture>,
    filters: CaptureFilters,
  ): void {
    if (filters.startDate) {
      qb.andWhere('capture.created_at >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      qb.andWhere('capture.created_at <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.launchId) {
      qb.andWhere('capture.launch_id = :launchId', {
        launchId: filters.launchId,
      });
    }

    if (filters.temperatureId) {
      qb.andWhere('capture.temperature_id = :temperatureId', {
        temperatureId: filters.temperatureId,
      });
    }

    if (filters.seasonId) {
      qb.andWhere('capture.season_id = :seasonId', {
        seasonId: filters.seasonId,
      });
    }

    if (filters.quizAnswered === true) {
      qb.andWhere('capture.form_version_id IS NOT NULL');
    }

    if (filters.quizAnswered === false) {
      qb.andWhere('capture.form_version_id IS NULL');
    }

    if (filters.email) {
      qb.andWhere(
        `(NULLIF(LOWER(TRIM(capture.metadata ->> 'email')), '') = :email
          OR (
            NULLIF(TRIM(capture.metadata ->> 'email'), '') IS NULL
            AND EXISTS (
              SELECT 1
              FROM person_identifier pi_email
              INNER JOIN identifier_type it_email
                ON it_email.id = pi_email.identifier_type_id
              WHERE pi_email.person_id = capture.person_id
                AND it_email.code = 'EMAIL'
                AND pi_email.value_normalized = :email
            )
          )
        )`,
        { email: filters.email },
      );
    }

    if (filters.phone) {
      const phoneDigits = filters.phone.replace(/\D+/g, '');
      qb.andWhere(
        `(regexp_replace(COALESCE(capture.metadata ->> 'telefone', capture.metadata ->> 'phone', ''), '\\D', '', 'g') = :phoneDigits
          OR (
            NULLIF(TRIM(COALESCE(capture.metadata ->> 'telefone', capture.metadata ->> 'phone')), '') IS NULL
            AND EXISTS (
              SELECT 1
              FROM person_identifier pi_phone
              INNER JOIN identifier_type it_phone
                ON it_phone.id = pi_phone.identifier_type_id
              WHERE pi_phone.person_id = capture.person_id
                AND it_phone.code = 'PHONE'
                AND (
                  pi_phone.value_normalized = :phone
                  OR regexp_replace(pi_phone.value_normalized, '\\D', '', 'g') = :phoneDigits
                )
            )
          )
        )`,
        { phone: filters.phone, phoneDigits },
      );
    }
  }

  private async buildExportDataset(query: CaptureFilterQueryDto): Promise<{
    items: CaptureListItemDto[];
    questionHeaders: string[];
    answersByCapture: Map<string, Map<string, string>>;
  }> {
    const filters = this.parseFilters(query);
    const rows = await this.buildDataQuery(filters).getRawMany<CaptureRawRow>();
    const { detailsByCapture, questionHeaders, answersByCapture } =
      await this.resolveQuizExportData(rows.map((row) => row.id));
    const items = await this.mapRowsToItems(rows, detailsByCapture);
    return { items, questionHeaders, answersByCapture };
  }

  private async collectExportQuestionHeaders(
    filters: CaptureFilters,
  ): Promise<string[]> {
    const questionLabelsByKey = new Map<string, string>();
    let cursor: { createdAt: Date; id: string } | undefined;

    for (;;) {
      const rows = await this.buildExportBatchQuery(
        filters,
        cursor,
        CaptureService.EXPORT_BATCH_SIZE,
      ).getRawMany<CaptureRawRow>();

      if (!rows.length) break;

      const { questionLabelsByKey: batchQuestionLabelsByKey } =
        await this.resolveQuizExportData(rows.map((row) => row.id));
      for (const [key, label] of batchQuestionLabelsByKey) {
        if (!questionLabelsByKey.has(key)) {
          questionLabelsByKey.set(key, label);
        }
      }

      const lastRow = rows[rows.length - 1];
      const lastCreatedAt =
        lastRow.created_at instanceof Date
          ? lastRow.created_at
          : new Date(lastRow.created_at);
      cursor = { createdAt: lastCreatedAt, id: lastRow.id };

      if (rows.length < CaptureService.EXPORT_BATCH_SIZE) break;
    }

    return [...questionLabelsByKey.entries()]
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB, 'pt-BR'))
      .map(([, label]) => label);
  }

  private async mapRowsToItems(
    rows: CaptureRawRow[],
    quizDetailsByCapture?: Map<string, CaptureQuizExportDetail>,
  ): Promise<CaptureListItemDto[]> {
    const personContacts = await this.resolvePersonContacts(
      rows.map((row) => row.person_id).filter((id): id is string => !!id),
    );

    return rows.map((row) => ({
      ...(quizDetailsByCapture?.get(row.id) ?? {
        quiz_answered: Boolean(row.form_version_id),
        score_total: null,
        faixa: null,
        quiz_answers: null,
      }),
      id: row.id,
      page: row.page,
      path: row.path,
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
      utm_content: row.utm_content,
      utm_term: row.utm_term,
      utm_id: row.utm_id,
      created_at: this.toIsoString(row.created_at),
      person_id: row.person_id,
      name: row.name,
      person_email:
        row.capture_email ??
        personContacts.get(row.person_id ?? '')?.email ??
        null,
      person_phone:
        row.capture_phone ??
        personContacts.get(row.person_id ?? '')?.phone ??
        null,
      platform_id: row.platform_id,
      platform_name: row.platform_name,
      strategy_id: row.strategy_id,
      strategy_name: row.strategy_name,
      temperature_id: row.temperature_id,
      temperature_name: row.temperature_name,
      launch_id: row.launch_id,
      launch_name: row.launch_name,
      season_id: row.season_id,
      season_name: row.season_name,
      tag_id: row.tag_id,
      tag_name: row.tag_name,
      ad_id: row.ad_id,
      ad_name: row.ad_name,
      external_ad_id: row.external_ad_id,
      external_ad_name: row.external_ad_name,
      activecampaign_contact_id: row.activecampaign_contact_id,
    }));
  }

  private toNumber(value: number | string | null | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private toIsoString(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString();
  }

  private toExportString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value);
  }

  private toExportCaptureValue(
    item: CaptureListItemDto,
    key: keyof CaptureListItemDto,
  ): string {
    if (key === 'quiz_answered') {
      return item.quiz_answered ? 'Sim' : 'Não';
    }
    return this.toExportString(item[key]);
  }

  private escapeCsv(value: string): string {
    if (!/[",\r\n]/.test(value)) return value;
    return `"${value.replace(/"/g, '""')}"`;
  }

  private formatQuizAnswerValue(answer: FormAnswerRawRow): string {
    if (typeof answer.option_text === 'string' && answer.option_text.trim()) {
      return answer.option_text.trim();
    }
    if (typeof answer.answer_text === 'string' && answer.answer_text.trim()) {
      return answer.answer_text.trim();
    }
    if (typeof answer.answer_number === 'number') {
      return String(answer.answer_number);
    }
    if (typeof answer.answer_bool === 'boolean') {
      return answer.answer_bool ? 'Sim' : 'Não';
    }
    return '';
  }

  // Single pass over form_response/leadscore_result/form_answer that produces
  // both the per-capture quiz summary and the per-question answer breakdown.
  private async resolveQuizExportData(captureIds: string[]): Promise<{
    detailsByCapture: Map<string, CaptureQuizExportDetail>;
    questionHeaders: string[];
    questionLabelsByKey: Map<string, string>;
    answersByCapture: Map<string, Map<string, string>>;
  }> {
    const uniqueCaptureIds = [...new Set(captureIds)];
    const detailsByCapture = new Map<string, CaptureQuizExportDetail>();
    const answersByCapture = new Map<string, Map<string, string>>();
    const questionLabelsByKey = new Map<string, string>();

    if (!uniqueCaptureIds.length) {
      return {
        detailsByCapture,
        questionHeaders: [],
        questionLabelsByKey,
        answersByCapture,
      };
    }

    const captureIdBatches = this.chunkArray(
      uniqueCaptureIds,
      CaptureService.PERSON_CONTACTS_BATCH_SIZE,
    );

    for (const captureIdBatch of captureIdBatches) {
      const latestResponses = await this.formResponseRepo
        .createQueryBuilder('fr')
        .select(['fr.id AS form_response_id', 'fr.capture_id AS capture_id'])
        .where('fr.capture_id IN (:...captureIds)', {
          captureIds: captureIdBatch,
        })
        .orderBy('fr.capture_id', 'ASC')
        .addOrderBy('fr.submitted_at', 'DESC', 'NULLS LAST')
        .addOrderBy('fr.created_at', 'DESC')
        .getRawMany<FormResponseCaptureRawRow>();

      const formResponseByCapture = new Map<string, string>();
      for (const row of latestResponses) {
        if (!formResponseByCapture.has(row.capture_id)) {
          formResponseByCapture.set(row.capture_id, row.form_response_id);
        }
      }
      if (!formResponseByCapture.size) continue;

      const captureByFormResponse = new Map<string, string>();
      for (const [
        captureId,
        formResponseId,
      ] of formResponseByCapture.entries()) {
        captureByFormResponse.set(formResponseId, captureId);
      }

      const formResponseIds = [...new Set(formResponseByCapture.values())];
      const formResponseIdBatches = this.chunkArray(
        formResponseIds,
        CaptureService.PERSON_CONTACTS_BATCH_SIZE,
      );

      const scoreByFormResponse = new Map<
        string,
        { score_total: number | null; faixa: string | null }
      >();
      const concatenatedAnswersByFormResponse = new Map<string, string>();

      for (const formResponseIdBatch of formResponseIdBatches) {
        const leadscoreResults = await this.leadscoreResultRepo
          .createQueryBuilder('lr')
          .leftJoin('lr.tier', 'tier')
          .select([
            'lr.form_response_id AS form_response_id',
            'lr.score_total AS score_total',
            'tier.name AS faixa',
          ])
          .where('lr.form_response_id IN (:...formResponseIds)', {
            formResponseIds: formResponseIdBatch,
          })
          .orderBy('lr.form_response_id', 'ASC')
          .addOrderBy('lr.created_at', 'DESC')
          .getRawMany<LeadscoreResultRawRow>();

        for (const row of leadscoreResults) {
          if (!scoreByFormResponse.has(row.form_response_id)) {
            scoreByFormResponse.set(row.form_response_id, {
              score_total: row.score_total,
              faixa: row.faixa,
            });
          }
        }

        const formAnswers = await this.formAnswerRepo
          .createQueryBuilder('fa')
          .leftJoin('fa.question', 'question')
          .leftJoin('fa.option', 'option')
          .select([
            'fa.form_response_id AS form_response_id',
            'question.question_key AS question_key',
            'question.question_text AS question_text',
            'option.option_text AS option_text',
            'fa.answer_text AS answer_text',
            'fa.answer_number AS answer_number',
            'fa.answer_bool AS answer_bool',
          ])
          .where('fa.form_response_id IN (:...formResponseIds)', {
            formResponseIds: formResponseIdBatch,
          })
          .orderBy('fa.form_response_id', 'ASC')
          .addOrderBy('question.question_key', 'ASC')
          .addOrderBy('fa.created_at', 'ASC')
          .getRawMany<FormAnswerRawRow>();

        const groupedAnswers = new Map<string, string[]>();
        for (const answer of formAnswers) {
          const value = this.formatQuizAnswerValue(answer);
          const questionLabel =
            answer.question_text ?? answer.question_key ?? 'Pergunta';

          const piece = value ? `${questionLabel}: ${value}` : questionLabel;
          const list = groupedAnswers.get(answer.form_response_id) ?? [];
          list.push(piece);
          groupedAnswers.set(answer.form_response_id, list);

          const captureId = captureByFormResponse.get(answer.form_response_id);
          if (captureId) {
            const questionKey =
              answer.question_key ?? answer.question_text ?? 'question';
            if (!questionLabelsByKey.has(questionKey)) {
              questionLabelsByKey.set(questionKey, questionLabel);
            }

            const answerMap =
              answersByCapture.get(captureId) ?? new Map<string, string>();
            answerMap.set(questionLabel, value);
            answersByCapture.set(captureId, answerMap);
          }
        }

        for (const [formResponseId, answerList] of groupedAnswers.entries()) {
          concatenatedAnswersByFormResponse.set(
            formResponseId,
            answerList.join(' | '),
          );
        }
      }

      for (const [
        captureId,
        formResponseId,
      ] of formResponseByCapture.entries()) {
        const score = scoreByFormResponse.get(formResponseId);
        detailsByCapture.set(captureId, {
          quiz_answered: true,
          score_total: score?.score_total ?? null,
          faixa: score?.faixa ?? null,
          quiz_answers:
            concatenatedAnswersByFormResponse.get(formResponseId) ?? null,
        });
      }
    }

    const questionHeaders = [...questionLabelsByKey.entries()]
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB, 'pt-BR'))
      .map(([, label]) => label);

    return {
      detailsByCapture,
      questionHeaders,
      questionLabelsByKey,
      answersByCapture,
    };
  }

  // Resolves only the specific question_keys requested by a sync `map`, scoped to the given captures.
  private async resolveQuizAnswerValuesByQuestionKey(
    captureIds: string[],
    questionKeys: string[],
  ): Promise<Map<string, Map<string, string>>> {
    const uniqueCaptureIds = [...new Set(captureIds)];
    const uniqueQuestionKeys = [...new Set(questionKeys)];
    const out = new Map<string, Map<string, string>>();

    if (!uniqueCaptureIds.length || !uniqueQuestionKeys.length) return out;

    const captureIdBatches = this.chunkArray(
      uniqueCaptureIds,
      CaptureService.PERSON_CONTACTS_BATCH_SIZE,
    );

    for (const captureIdBatch of captureIdBatches) {
      const latestResponses = await this.formResponseRepo
        .createQueryBuilder('fr')
        .select(['fr.id AS form_response_id', 'fr.capture_id AS capture_id'])
        .where('fr.capture_id IN (:...captureIds)', {
          captureIds: captureIdBatch,
        })
        .orderBy('fr.capture_id', 'ASC')
        .addOrderBy('fr.submitted_at', 'DESC', 'NULLS LAST')
        .addOrderBy('fr.created_at', 'DESC')
        .getRawMany<FormResponseCaptureRawRow>();

      const formResponseByCapture = new Map<string, string>();
      for (const row of latestResponses) {
        if (!formResponseByCapture.has(row.capture_id)) {
          formResponseByCapture.set(row.capture_id, row.form_response_id);
        }
      }
      if (!formResponseByCapture.size) continue;

      const captureByFormResponse = new Map<string, string>();
      for (const [
        captureId,
        formResponseId,
      ] of formResponseByCapture.entries()) {
        captureByFormResponse.set(formResponseId, captureId);
      }

      const formResponseIds = [...new Set(formResponseByCapture.values())];
      const formResponseIdBatches = this.chunkArray(
        formResponseIds,
        CaptureService.PERSON_CONTACTS_BATCH_SIZE,
      );

      for (const formResponseIdBatch of formResponseIdBatches) {
        const formAnswers = await this.formAnswerRepo
          .createQueryBuilder('fa')
          .leftJoin('fa.question', 'question')
          .leftJoin('fa.option', 'option')
          .select([
            'fa.form_response_id AS form_response_id',
            'question.question_key AS question_key',
            'question.question_text AS question_text',
            'option.option_text AS option_text',
            'fa.answer_text AS answer_text',
            'fa.answer_number AS answer_number',
            'fa.answer_bool AS answer_bool',
          ])
          .where('fa.form_response_id IN (:...formResponseIds)', {
            formResponseIds: formResponseIdBatch,
          })
          .andWhere('question.question_key IN (:...questionKeys)', {
            questionKeys: uniqueQuestionKeys,
          })
          .getRawMany<FormAnswerRawRow>();

        for (const answer of formAnswers) {
          const captureId = captureByFormResponse.get(answer.form_response_id);
          if (!captureId || !answer.question_key) continue;

          const value = this.formatQuizAnswerValue(answer);
          const answerMap = out.get(captureId) ?? new Map<string, string>();
          answerMap.set(answer.question_key, value);
          out.set(captureId, answerMap);
        }
      }
    }

    return out;
  }

  private async resolvePersonContacts(personIds: string[]) {
    const uniquePersonIds = [...new Set(personIds)];
    const out = new Map<
      string,
      { email: string | null; phone: string | null }
    >();

    if (!uniquePersonIds.length) return out;

    const personIdBatches = this.chunkArray(
      uniquePersonIds,
      CaptureService.PERSON_CONTACTS_BATCH_SIZE,
    );

    for (const personIdBatch of personIdBatches) {
      const rows = await this.personIdentifierRepo
        .createQueryBuilder('pi')
        .innerJoin('pi.identifier_type', 'it')
        .select([
          'pi.person_id AS person_id',
          'it.code AS type_code',
          'pi.value_normalized AS value_normalized',
        ])
        .where('pi.person_id IN (:...personIds)', { personIds: personIdBatch })
        .andWhere("it.code IN ('EMAIL', 'PHONE')")
        .orderBy('pi.person_id', 'ASC')
        .addOrderBy('it.code', 'ASC')
        .addOrderBy('pi.is_primary', 'DESC')
        .addOrderBy('pi.created_at', 'DESC')
        .getRawMany<PersonIdentifierRawRow>();

      for (const row of rows) {
        const entry = out.get(row.person_id) ?? { email: null, phone: null };
        if (row.type_code === 'EMAIL' && !entry.email) {
          entry.email = row.value_normalized;
        }
        if (row.type_code === 'PHONE' && !entry.phone) {
          entry.phone = row.value_normalized;
        }
        out.set(row.person_id, entry);
      }
    }

    return out;
  }

  private chunkArray<T>(values: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < values.length; index += chunkSize) {
      chunks.push(values.slice(index, index + chunkSize));
    }
    return chunks;
  }
}
