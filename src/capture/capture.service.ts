import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Capture } from '../database/entities/capture/capture.entity';
import { FormAnswer } from '../database/entities/form/form-answer.entity';
import { FormResponse } from '../database/entities/form/form-response.entity';
import { LeadscoreResult } from '../database/entities/leadscore/leadscore-result.entity';
import { PersonIdentifier } from '../database/entities/identity/person-identifier.entity';
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

type CaptureFilters = {
  startDate?: Date;
  endDate?: Date;
  launchId?: string;
  temperatureId?: string;
  seasonId?: string;
  quizAnswered?: boolean;
};

type CaptureFilterQuery = Pick<
  CaptureFilterQueryDto,
  | 'start_date'
  | 'end_date'
  | 'launch_id'
  | 'temperature_id'
  | 'season_id'
  | 'quiz_answered'
>;

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

@Injectable()
export class CaptureService {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private static readonly PERSON_CONTACTS_BATCH_SIZE = 2000;
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

  async exportCapturesCsv(query: CaptureFilterQueryDto): Promise<string> {
    const startedAt = Date.now();
    this.logger.log('Capture CSV export started.');

    const items = await this.listCaptureItems(query, {
      includeQuizDetails: true,
    });
    const columns = CaptureService.EXPORT_COLUMNS;
    const { questionHeaders, answersByCapture } =
      await this.resolveQuizAnswersByCapture(items.map((item) => item.id));

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

    this.logger.log(
      `Capture CSV export finished in ${Date.now() - startedAt}ms (items=${items.length}).`,
    );

    return `\uFEFF${csv}`;
  }

  async exportCapturesExcel(query: CaptureFilterQueryDto): Promise<Buffer> {
    const startedAt = Date.now();
    this.logger.log('Capture Excel export started.');

    const items = await this.listCaptureItems(query, {
      includeQuizDetails: true,
    });
    const columns = CaptureService.EXPORT_COLUMNS;
    const { questionHeaders, answersByCapture } =
      await this.resolveQuizAnswersByCapture(items.map((item) => item.id));
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

    for (const item of items) {
      const baseColumns = columns.map((column) =>
        this.toExportCaptureValue(item, column.key),
      );
      const answerMap = answersByCapture.get(item.id);
      const questionColumns = questionHeaders.map((questionHeader) =>
        this.toExportString(answerMap?.get(questionHeader) ?? ''),
      );
      worksheet.addRow([...baseColumns, ...questionColumns]);
    }

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.commit?.();

    const data = await workbook.xlsx.writeBuffer();
    const out = Buffer.isBuffer(data) ? data : Buffer.from(data);

    this.logger.log(
      `Capture Excel export finished in ${Date.now() - startedAt}ms (items=${items.length}).`,
    );

    return out;
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

  private parseFilters(query: CaptureFilterQuery): CaptureFilters {
    const filters: CaptureFilters = {
      startDate: this.parseDateBoundary(query.start_date, false, 'start_date'),
      endDate: this.parseDateBoundary(query.end_date, true, 'end_date'),
      launchId: this.parseUuid(query.launch_id, 'launch_id'),
      temperatureId: this.parseUuid(query.temperature_id, 'temperature_id'),
      seasonId: this.parseUuid(query.season_id, 'season_id'),
      quizAnswered: this.parseBoolean(query.quiz_answered, 'quiz_answered'),
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

  private buildDataQuery(
    filters: CaptureFilters,
    pagination?: { page: number; perPage: number },
  ): SelectQueryBuilder<Capture> {
    const externalAdExpression =
      "COALESCE(capture.utms ->> 'h_ad_id', capture.metadata -> 'utms' ->> 'h_ad_id', capture.metadata ->> 'h_ad_id')";

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
  }

  private async listCaptureItems(
    query: CaptureFilterQuery,
    options?: { includeQuizDetails?: boolean },
  ): Promise<CaptureListItemDto[]> {
    const filters = this.parseFilters(query);
    const rows = await this.buildDataQuery(filters).getRawMany<CaptureRawRow>();
    return await this.mapRowsToItems(rows, options);
  }

  private async mapRowsToItems(
    rows: CaptureRawRow[],
    options?: { includeQuizDetails?: boolean },
  ): Promise<CaptureListItemDto[]> {
    const includeQuizDetails = options?.includeQuizDetails === true;
    const personContacts = await this.resolvePersonContacts(
      rows.map((row) => row.person_id).filter((id): id is string => !!id),
    );
    const quizDetailsByCapture = includeQuizDetails
      ? await this.resolveLatestQuizDetailsByCapture(rows.map((row) => row.id))
      : new Map<string, CaptureQuizExportDetail>();

    return rows.map((row) => ({
      ...(quizDetailsByCapture.get(row.id) ?? {
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
      person_email: personContacts.get(row.person_id ?? '')?.email ?? null,
      person_phone: personContacts.get(row.person_id ?? '')?.phone ?? null,
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
    }));
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

  private async resolveQuizAnswersByCapture(captureIds: string[]) {
    const uniqueCaptureIds = [...new Set(captureIds)];
    const answersByCapture = new Map<string, Map<string, string>>();
    const questionLabelsByKey = new Map<string, string>();

    if (!uniqueCaptureIds.length) {
      return { questionHeaders: [] as string[], answersByCapture };
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
          .orderBy('fa.form_response_id', 'ASC')
          .addOrderBy('question.question_key', 'ASC')
          .addOrderBy('fa.created_at', 'ASC')
          .getRawMany<FormAnswerRawRow>();

        for (const answer of formAnswers) {
          const captureId = captureByFormResponse.get(answer.form_response_id);
          if (!captureId) continue;

          const questionKey =
            answer.question_key ?? answer.question_text ?? 'question';
          const questionLabel =
            answer.question_text ?? answer.question_key ?? 'Pergunta';
          if (!questionLabelsByKey.has(questionKey)) {
            questionLabelsByKey.set(questionKey, questionLabel);
          }

          const value = this.formatQuizAnswerValue(answer);
          const answerMap =
            answersByCapture.get(captureId) ?? new Map<string, string>();
          answerMap.set(questionLabel, value);
          answersByCapture.set(captureId, answerMap);
        }
      }
    }

    const questionHeaders = [...questionLabelsByKey.entries()]
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB, 'pt-BR'))
      .map(([, label]) => label);

    return { questionHeaders, answersByCapture };
  }

  private async resolveLatestQuizDetailsByCapture(captureIds: string[]) {
    const uniqueCaptureIds = [...new Set(captureIds)];
    const out = new Map<string, CaptureQuizExportDetail>();
    if (!uniqueCaptureIds.length) return out;

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

      const formResponseIds = [...new Set(formResponseByCapture.values())];
      const formResponseIdBatches = this.chunkArray(
        formResponseIds,
        CaptureService.PERSON_CONTACTS_BATCH_SIZE,
      );

      const scoreByFormResponse = new Map<
        string,
        { score_total: number | null; faixa: string | null }
      >();
      const answersByFormResponse = new Map<string, string>();

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
          const questionLabel =
            answer.question_text ?? answer.question_key ?? 'Pergunta';
          const value = this.formatQuizAnswerValue(answer);
          const piece = value ? `${questionLabel}: ${value}` : questionLabel;
          const list = groupedAnswers.get(answer.form_response_id) ?? [];
          list.push(piece);
          groupedAnswers.set(answer.form_response_id, list);
        }

        for (const [formResponseId, answerList] of groupedAnswers.entries()) {
          answersByFormResponse.set(formResponseId, answerList.join(' | '));
        }
      }

      for (const [
        captureId,
        formResponseId,
      ] of formResponseByCapture.entries()) {
        const score = scoreByFormResponse.get(formResponseId);
        out.set(captureId, {
          quiz_answered: true,
          score_total: score?.score_total ?? null,
          faixa: score?.faixa ?? null,
          quiz_answers: answersByFormResponse.get(formResponseId) ?? null,
        });
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
