import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Form } from '../database/entities/form/form.entity';
import { FormVersion } from '../database/entities/form/form-version.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { Season } from '../database/entities/marketing/season.entity';
import { Temperature } from '../database/entities/marketing/temperature.entity';
import { PageHeadline } from '../database/entities/page/page-headline.entity';
import { PageTemperature } from '../database/entities/page/page-temperature.entity';
import { PageVersion } from '../database/entities/page/page-version.entity';
import { Page } from '../database/entities/page/page.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { GroupedPageByLaunchDto } from './dto/grouped-page-response.dto';
import { ListPageQueryDto } from './dto/list-page-query.dto';
import { ListPageItemDto } from './dto/list-page-response.dto';
import {
  CreatePageHeadlineDto,
  PageHeadlineResponseDto,
  UpdatePageHeadlineDto,
} from './dto/page-headline.dto';
import { PageResponseDto } from './dto/page-response.dto';
import {
  CreatePageTemperatureDto,
  PageTemperatureResponseDto,
  UpdatePageTemperatureDto,
} from './dto/page-temperature.dto';
import {
  CreatePageVersionDto,
  PageVersionResponseDto,
  UpdatePageVersionDto,
} from './dto/page-version.dto';
import { UpdatePageDto } from './dto/update-page.dto';

type PageRawRow = {
  id: string;
  abbreviation: string;
  name: string;
  launch_id: string | null;
  season_id: string | null;
  form_id: string;
  form_version_id: string;
  active: boolean;
  launch_name: string | null;
};

@Injectable()
export class PageService {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
    @InjectRepository(PageHeadline)
    private readonly headlineRepo: Repository<PageHeadline>,
    @InjectRepository(PageTemperature)
    private readonly pageTemperatureRepo: Repository<PageTemperature>,
    @InjectRepository(PageVersion)
    private readonly pageVersionRepo: Repository<PageVersion>,
    @InjectRepository(Launch)
    private readonly launchRepo: Repository<Launch>,
    @InjectRepository(Season)
    private readonly seasonRepo: Repository<Season>,
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
    @InjectRepository(FormVersion)
    private readonly formVersionRepo: Repository<FormVersion>,
    @InjectRepository(Temperature)
    private readonly temperatureRepo: Repository<Temperature>,
  ) {}

  async listAll(query: ListPageQueryDto): Promise<ListPageItemDto[]> {
    const launchId = this.parseOptionalUuid(query.launch_id, 'launch_id');
    const seasonId = this.parseOptionalUuid(query.season_id, 'season_id');
    const formId = this.parseOptionalUuid(query.form_id, 'form_id');
    const abbreviation = this.parseOptionalText(query.abbreviation);
    const active = this.parseOptionalBoolean(query.active, 'active');

    const qb = this.pageRepo
      .createQueryBuilder('page')
      .select([
        'page.id AS id',
        'page.abbreviation AS abbreviation',
        'page.name AS name',
        'page.launch_id AS launch_id',
        'launch.name AS launch_name',
        'page.season_id AS season_id',
        'page.form_id AS form_id',
        'page.form_version_id AS form_version_id',
        'page.active AS active',
      ])
      .leftJoin('page.launch', 'launch')
      .orderBy('page.created_at', 'DESC')
      .addOrderBy('page.id', 'ASC');

    if (launchId) qb.andWhere('page.launch_id = :launchId', { launchId });
    if (seasonId) qb.andWhere('page.season_id = :seasonId', { seasonId });
    if (formId) qb.andWhere('page.form_id = :formId', { formId });
    if (abbreviation) {
      qb.andWhere('LOWER(page.abbreviation) = :abbreviation', {
        abbreviation: abbreviation.toLowerCase(),
      });
    }
    if (active !== undefined) qb.andWhere('page.active = :active', { active });

    return await qb.getRawMany<PageRawRow>();
  }

  async listGroupedByLaunch(
    query: ListPageQueryDto,
  ): Promise<GroupedPageByLaunchDto[]> {
    const pages = await this.listAll(query);
    const grouped = new Map<string, GroupedPageByLaunchDto>();

    for (const page of pages) {
      const key = page.launch_id ?? 'without-launch';
      const group = grouped.get(key);

      if (group) {
        group.pages.push(page);
        group.total_pages = group.pages.length;
        continue;
      }

      grouped.set(key, {
        launch_id: page.launch_id,
        launch_name: page.launch_name ?? null,
        total_pages: 1,
        pages: [page],
      });
    }

    return [...grouped.values()];
  }

  async findById(id: string): Promise<PageResponseDto> {
    const page = await this.findPageOrFail(id);
    return this.mapPageResponse(page);
  }

  async create(dto: CreatePageDto): Promise<PageResponseDto> {
    const name = this.parseRequiredText(dto.name, 'name');
    const launchId = this.parseOptionalUuid(dto.launch_id, 'launch_id');
    const seasonId = this.parseOptionalUuid(dto.season_id, 'season_id');
    const formId = this.parseRequiredUuid(dto.form_id, 'form_id');
    const formVersionId = this.parseRequiredUuid(
      dto.form_version_id,
      'form_version_id',
    );
    const active = this.parseOptionalBoolean(dto.active, 'active') ?? true;
    const headlineDtos = this.parseOptionalArray(dto.headlines, 'headlines');
    const temperatureDtos = this.parseOptionalArray(
      dto.temperatures,
      'temperatures',
    );
    const versionDtos = this.parseOptionalArray(dto.versions, 'versions');

    const launch = launchId
      ? await this.mustFindLaunchById(launchId)
      : undefined;
    const season = seasonId
      ? await this.mustFindSeasonById(seasonId)
      : undefined;
    this.assertLaunchSeasonConsistency(launch, season);
    await this.assertActivePageCanUseLaunch(launch?.id, active);

    const form = await this.mustFindFormById(formId);
    const formVersion = await this.mustFindFormVersionById(formVersionId);
    this.assertFormVersionConsistency(form, formVersion);
    this.assertUniqueTemperatures(temperatureDtos);

    const savedPageId = await this.dataSource.transaction(async (manager) => {
      const pageRepo = manager.getRepository(Page);
      const page = await pageRepo.save(
        pageRepo.create({
          abbreviation: await this.nextGlobalAbbreviation(manager),
          name,
          launch,
          season,
          form,
          form_version: formVersion,
          active,
        }),
      );

      await this.createHeadlines(manager, page, headlineDtos);
      await this.createTemperatures(manager, page, temperatureDtos);
      await this.createVersions(manager, page, versionDtos);
      return page.id;
    });

    return this.findById(savedPageId);
  }

  async update(id: string, dto: UpdatePageDto): Promise<PageResponseDto> {
    const page = await this.pageRepo.findOne({
      where: { id },
      relations: ['launch', 'season', 'form', 'form_version'],
    });

    if (!page) {
      throw new NotFoundException(`Page nao encontrada para id=${id}.`);
    }

    if (
      dto.name === undefined &&
      dto.launch_id === undefined &&
      dto.season_id === undefined &&
      dto.form_id === undefined &&
      dto.form_version_id === undefined &&
      dto.active === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao.',
      );
    }

    if (dto.name !== undefined) {
      page.name = this.parseRequiredText(dto.name, 'name');
    }
    if (dto.launch_id !== undefined) {
      const launchId = this.parseRequiredUuid(dto.launch_id, 'launch_id');
      page.launch = await this.mustFindLaunchById(launchId);
    }
    if (dto.season_id !== undefined) {
      const seasonId = this.parseRequiredUuid(dto.season_id, 'season_id');
      page.season = await this.mustFindSeasonById(seasonId);
    }
    if (dto.form_id !== undefined) {
      const formId = this.parseRequiredUuid(dto.form_id, 'form_id');
      page.form = await this.mustFindFormById(formId);
    }
    if (dto.form_version_id !== undefined) {
      const formVersionId = this.parseRequiredUuid(
        dto.form_version_id,
        'form_version_id',
      );
      page.form_version = await this.mustFindFormVersionById(formVersionId);
    }
    if (dto.active !== undefined) {
      page.active = this.parseRequiredBoolean(dto.active, 'active');
    }

    this.assertLaunchSeasonConsistency(page.launch, page.season);
    this.assertFormVersionConsistency(page.form, page.form_version);
    await this.assertActivePageCanUseLaunch(
      page.launch?.id,
      page.active,
      page.id,
    );

    await this.pageRepo.save(page);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.pageRepo.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Page nao encontrada para id=${id}.`);
    }
  }

  async createHeadline(
    pageId: string,
    dto: CreatePageHeadlineDto,
  ): Promise<PageHeadlineResponseDto> {
    const page = await this.mustFindPageEntityById(pageId);
    const saved = await this.dataSource.transaction(async (manager) => {
      const [abbreviation, position] = await Promise.all([
        this.nextScopedAbbreviation(manager, 'page_headline', pageId, 'h'),
        this.resolveHeadlinePosition(manager, pageId, dto.position),
      ]);
      const headlineRepo = manager.getRepository(PageHeadline);
      return await headlineRepo.save(
        headlineRepo.create({
          page,
          abbreviation,
          content: this.parseRequiredText(dto.content, 'content'),
          position,
          active: this.parseOptionalBoolean(dto.active, 'active') ?? true,
        }),
      );
    });

    return this.mapHeadlineResponse(saved);
  }

  async updateHeadline(
    pageId: string,
    headlineId: string,
    dto: UpdatePageHeadlineDto,
  ): Promise<PageHeadlineResponseDto> {
    const headline = await this.headlineRepo.findOne({
      where: { id: headlineId, page: { id: pageId } },
      relations: ['page'],
    });
    if (!headline) {
      throw new NotFoundException(`Headline nao encontrada para id=${headlineId}.`);
    }
    if (
      dto.content === undefined &&
      dto.position === undefined &&
      dto.active === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao.',
      );
    }
    if (dto.content !== undefined) {
      headline.content = this.parseRequiredText(dto.content, 'content');
    }
    if (dto.position !== undefined) {
      headline.position = this.parseRequiredInteger(dto.position, 'position');
    }
    if (dto.active !== undefined) {
      headline.active = this.parseRequiredBoolean(dto.active, 'active');
    }
    return this.mapHeadlineResponse(await this.headlineRepo.save(headline));
  }

  async removeHeadline(pageId: string, headlineId: string): Promise<void> {
    const result = await this.headlineRepo
      .createQueryBuilder()
      .delete()
      .where('id = :headlineId', { headlineId })
      .andWhere('page_id = :pageId', { pageId })
      .execute();
    if (!result.affected) {
      throw new NotFoundException(`Headline nao encontrada para id=${headlineId}.`);
    }
  }

  async createTemperature(
    pageId: string,
    dto: CreatePageTemperatureDto,
  ): Promise<PageTemperatureResponseDto> {
    const page = await this.mustFindPageEntityById(pageId);
    const temperature = await this.mustFindTemperatureById(
      this.parseRequiredUuid(dto.temperature_id, 'temperature_id'),
    );
    const saved = await this.pageTemperatureRepo.save(
      this.pageTemperatureRepo.create({
        page,
        temperature,
        tag_id: this.parseRequiredText(dto.tag_id, 'tag_id'),
        redirect_url: this.parseRequiredText(dto.redirect_url, 'redirect_url'),
        active: this.parseOptionalBoolean(dto.active, 'active') ?? true,
      }),
    );
    return this.mapTemperatureResponse(saved);
  }

  async updateTemperature(
    pageId: string,
    pageTemperatureId: string,
    dto: UpdatePageTemperatureDto,
  ): Promise<PageTemperatureResponseDto> {
    const pageTemperature = await this.pageTemperatureRepo.findOne({
      where: { id: pageTemperatureId, page: { id: pageId } },
      relations: ['temperature', 'page'],
    });
    if (!pageTemperature) {
      throw new NotFoundException(
        `Temperatura da page nao encontrada para id=${pageTemperatureId}.`,
      );
    }
    if (
      dto.tag_id === undefined &&
      dto.redirect_url === undefined &&
      dto.active === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao.',
      );
    }
    if (dto.tag_id !== undefined) {
      pageTemperature.tag_id = this.parseRequiredText(dto.tag_id, 'tag_id');
    }
    if (dto.redirect_url !== undefined) {
      pageTemperature.redirect_url = this.parseRequiredText(
        dto.redirect_url,
        'redirect_url',
      );
    }
    if (dto.active !== undefined) {
      pageTemperature.active = this.parseRequiredBoolean(dto.active, 'active');
    }
    return this.mapTemperatureResponse(
      await this.pageTemperatureRepo.save(pageTemperature),
    );
  }

  async removeTemperature(
    pageId: string,
    pageTemperatureId: string,
  ): Promise<void> {
    const result = await this.pageTemperatureRepo
      .createQueryBuilder()
      .delete()
      .where('id = :pageTemperatureId', { pageTemperatureId })
      .andWhere('page_id = :pageId', { pageId })
      .execute();
    if (!result.affected) {
      throw new NotFoundException(
        `Temperatura da page nao encontrada para id=${pageTemperatureId}.`,
      );
    }
  }

  async createVersion(
    pageId: string,
    dto: CreatePageVersionDto,
  ): Promise<PageVersionResponseDto> {
    const page = await this.mustFindPageEntityById(pageId);
    const saved = await this.dataSource.transaction(async (manager) => {
      const [abbreviation, versionNumber] = await Promise.all([
        this.nextScopedAbbreviation(manager, 'page_version', pageId, 'v'),
        this.nextScopedNumber(manager, 'page_version', pageId, 'version_number'),
      ]);
      const pageVersionRepo = manager.getRepository(PageVersion);
      return await pageVersionRepo.save(
        pageVersionRepo.create({
          page,
          abbreviation,
          version_number: versionNumber,
          template_image_url: this.parseNullableText(dto.template_image_url),
          template_url: this.parseNullableText(dto.template_url),
          active: this.parseOptionalBoolean(dto.active, 'active') ?? true,
        }),
      );
    });

    return this.mapVersionResponse(saved);
  }

  async updateVersion(
    pageId: string,
    versionId: string,
    dto: UpdatePageVersionDto,
  ): Promise<PageVersionResponseDto> {
    const version = await this.pageVersionRepo.findOne({
      where: { id: versionId, page: { id: pageId } },
      relations: ['page'],
    });
    if (!version) {
      throw new NotFoundException(`Versao da page nao encontrada para id=${versionId}.`);
    }
    if (
      dto.template_image_url === undefined &&
      dto.template_url === undefined &&
      dto.active === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao.',
      );
    }
    if (dto.template_image_url !== undefined) {
      version.template_image_url = this.parseNullableText(
        dto.template_image_url,
      );
    }
    if (dto.template_url !== undefined) {
      version.template_url = this.parseNullableText(dto.template_url);
    }
    if (dto.active !== undefined) {
      version.active = this.parseRequiredBoolean(dto.active, 'active');
    }
    return this.mapVersionResponse(await this.pageVersionRepo.save(version));
  }

  async removeVersion(pageId: string, versionId: string): Promise<void> {
    const result = await this.pageVersionRepo
      .createQueryBuilder()
      .delete()
      .where('id = :versionId', { versionId })
      .andWhere('page_id = :pageId', { pageId })
      .execute();
    if (!result.affected) {
      throw new NotFoundException(`Versao da page nao encontrada para id=${versionId}.`);
    }
  }

  private async createHeadlines(
    manager: EntityManager,
    page: Page,
    dtos: CreatePageHeadlineDto[],
  ): Promise<void> {
    const headlineRepo = manager.getRepository(PageHeadline);
    for (const [index, dto] of dtos.entries()) {
      await headlineRepo.save(
        headlineRepo.create({
          page,
          abbreviation: `h${index + 1}`,
          content: this.parseRequiredText(dto.content, 'content'),
          position:
            dto.position !== undefined
              ? this.parseRequiredInteger(dto.position, 'position')
              : index + 1,
          active: this.parseOptionalBoolean(dto.active, 'active') ?? true,
        }),
      );
    }
  }

  private async createTemperatures(
    manager: EntityManager,
    page: Page,
    dtos: CreatePageTemperatureDto[],
  ): Promise<void> {
    const pageTemperatureRepo = manager.getRepository(PageTemperature);
    for (const dto of dtos) {
      const temperature = await this.mustFindTemperatureById(
        this.parseRequiredUuid(dto.temperature_id, 'temperature_id'),
      );
      await pageTemperatureRepo.save(
        pageTemperatureRepo.create({
          page,
          temperature,
          tag_id: this.parseRequiredText(dto.tag_id, 'tag_id'),
          redirect_url: this.parseRequiredText(dto.redirect_url, 'redirect_url'),
          active: this.parseOptionalBoolean(dto.active, 'active') ?? true,
        }),
      );
    }
  }

  private async createVersions(
    manager: EntityManager,
    page: Page,
    dtos: CreatePageVersionDto[],
  ): Promise<void> {
    const versionRepo = manager.getRepository(PageVersion);
    for (const [index, dto] of dtos.entries()) {
      await versionRepo.save(
        versionRepo.create({
          page,
          abbreviation: `v${index + 1}`,
          version_number: index + 1,
          template_image_url: this.parseNullableText(dto.template_image_url),
          template_url: this.parseNullableText(dto.template_url),
          active: this.parseOptionalBoolean(dto.active, 'active') ?? true,
        }),
      );
    }
  }

  private async findPageOrFail(id: string): Promise<Page> {
    const page = await this.pageRepo.findOne({
      where: { id },
      relations: [
        'launch',
        'season',
        'form',
        'form_version',
        'headlines',
        'temperatures',
        'temperatures.temperature',
        'versions',
      ],
    });
    if (!page) {
      throw new NotFoundException(`Page nao encontrada para id=${id}.`);
    }
    return page;
  }

  private async mustFindPageEntityById(id: string): Promise<Page> {
    const page = await this.pageRepo.findOne({ where: { id } });
    if (!page) {
      throw new NotFoundException(`Page nao encontrada para id=${id}.`);
    }
    return page;
  }

  private async mustFindLaunchById(launchId: string): Promise<Launch> {
    const launch = await this.launchRepo.findOne({ where: { id: launchId } });
    if (!launch) {
      throw new NotFoundException(`Launch nao encontrado para id=${launchId}.`);
    }
    return launch;
  }

  private async mustFindSeasonById(seasonId: string): Promise<Season> {
    const season = await this.seasonRepo.findOne({
      where: { id: seasonId },
      relations: ['launch'],
    });
    if (!season) {
      throw new NotFoundException(`Season nao encontrada para id=${seasonId}.`);
    }
    return season;
  }

  private async mustFindFormById(formId: string): Promise<Form> {
    const form = await this.formRepo.findOne({ where: { id: formId } });
    if (!form) {
      throw new NotFoundException(`Form nao encontrado para id=${formId}.`);
    }
    return form;
  }

  private async mustFindFormVersionById(
    formVersionId: string,
  ): Promise<FormVersion> {
    const formVersion = await this.formVersionRepo.findOne({
      where: { id: formVersionId },
      relations: ['form'],
    });
    if (!formVersion) {
      throw new NotFoundException(
        `Form version nao encontrada para id=${formVersionId}.`,
      );
    }
    return formVersion;
  }

  private async mustFindTemperatureById(
    temperatureId: string,
  ): Promise<Temperature> {
    const temperature = await this.temperatureRepo.findOne({
      where: { id: temperatureId },
    });
    if (!temperature) {
      throw new NotFoundException(
        `Temperature nao encontrada para id=${temperatureId}.`,
      );
    }
    return temperature;
  }

  private assertLaunchSeasonConsistency(
    launch?: Launch | null,
    season?: Season | null,
  ): void {
    if (!launch || !season || !season.launch) return;
    if (season.launch.id !== launch.id) {
      throw new BadRequestException(
        'season_id informado nao pertence ao launch_id informado.',
      );
    }
  }

  private assertFormVersionConsistency(
    form: Form,
    formVersion: FormVersion,
  ): void {
    if (formVersion.form.id !== form.id) {
      throw new BadRequestException(
        'form_version_id informado nao pertence ao form_id informado.',
      );
    }
  }

  private async assertActivePageCanUseLaunch(
    launchId: string | undefined,
    active: boolean,
    currentPageId?: string,
  ): Promise<void> {
    if (!active) return;

    if (!launchId) {
      throw new BadRequestException(
        'Uma page ativa precisa estar vinculada a um launch.',
      );
    }

    const qb = this.pageRepo
      .createQueryBuilder('page')
      .where('page.launch_id = :launchId', { launchId })
      .andWhere('page.active = true');

    if (currentPageId) {
      qb.andWhere('page.id <> :currentPageId', { currentPageId });
    }

    const activePage = await qb.getOne();
    if (activePage) {
      throw new BadRequestException(
        `Ja existe uma page ativa para launch_id=${launchId}. Desative a page atual antes de ativar outra.`,
      );
    }
  }

  private assertUniqueTemperatures(dtos: CreatePageTemperatureDto[]): void {
    const ids = dtos.map((dto) =>
      this.parseRequiredUuid(dto.temperature_id, 'temperature_id'),
    );
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'temperatures nao pode conter temperature_id duplicado.',
      );
    }
  }

  private async nextGlobalAbbreviation(
    manager: EntityManager,
  ): Promise<string> {
    const rows = await manager.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING("abbreviation" FROM 2) AS INTEGER)), 0) AS max
      FROM "page"
      WHERE "abbreviation" ~ '^p[0-9]+$'
    `);
    return `p${Number(rows[0]?.max ?? 0) + 1}`;
  }

  private async nextScopedAbbreviation(
    manager: EntityManager,
    tableName: 'page_headline' | 'page_version',
    pageId: string,
    prefix: 'h' | 'v',
  ): Promise<string> {
    const rows = await manager.query(
      `
        SELECT COALESCE(MAX(CAST(SUBSTRING("abbreviation" FROM 2) AS INTEGER)), 0) AS max
        FROM "${tableName}"
        WHERE "page_id" = $1 AND "abbreviation" ~ $2
      `,
      [pageId, `^${prefix}[0-9]+$`],
    );
    return `${prefix}${Number(rows[0]?.max ?? 0) + 1}`;
  }

  private async nextScopedNumber(
    manager: EntityManager,
    tableName: 'page_headline' | 'page_version',
    pageId: string,
    columnName: 'position' | 'version_number',
  ): Promise<number> {
    const rows = await manager.query(
      `
        SELECT COALESCE(MAX("${columnName}"), 0) AS max
        FROM "${tableName}"
        WHERE "page_id" = $1
      `,
      [pageId],
    );
    return Number(rows[0]?.max ?? 0) + 1;
  }

  private async resolveHeadlinePosition(
    manager: EntityManager,
    pageId: string,
    position: number | undefined,
  ): Promise<number> {
    if (position !== undefined) {
      return this.parseRequiredInteger(position, 'position');
    }
    return this.nextScopedNumber(manager, 'page_headline', pageId, 'position');
  }

  private parseRequiredText(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} deve ser string.`);
    }
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} e obrigatorio.`);
    }
    return normalized;
  }

  private parseOptionalText(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
      throw new BadRequestException('Valor invalido: esperado texto.');
    }
    const normalized = value.trim();
    return normalized || undefined;
  }

  private parseNullableText(value: unknown): string | null {
    return this.parseOptionalText(value) ?? null;
  }

  private parseOptionalUuid(
    value: string | undefined,
    fieldName: string,
  ): string | undefined {
    if (!value) return undefined;
    return this.parseRequiredUuid(value, fieldName);
  }

  private parseRequiredUuid(value: unknown, fieldName: string): string {
    if (value === undefined || value === null) {
      throw new BadRequestException(`${fieldName} e obrigatorio.`);
    }
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} deve ser string.`);
    }
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} e obrigatorio.`);
    }
    if (!PageService.UUID_REGEX.test(normalized)) {
      throw new BadRequestException(`${fieldName} deve ser um UUID valido.`);
    }
    return normalized;
  }

  private parseOptionalBoolean(
    value: unknown,
    fieldName: string,
  ): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return this.parseRequiredBoolean(value, fieldName);
  }

  private parseRequiredBoolean(value: unknown, fieldName: string): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    throw new BadRequestException(`${fieldName} deve ser boolean.`);
  }

  private parseRequiredInteger(value: unknown, fieldName: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      throw new BadRequestException(
        `${fieldName} deve ser um numero inteiro maior que zero.`,
      );
    }
    return value;
  }

  private parseOptionalArray<T>(value: T[] | undefined, fieldName: string): T[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      throw new BadRequestException(`${fieldName} deve ser um array.`);
    }
    return value;
  }

  private mapPageResponse(page: Page): PageResponseDto {
    const headlines = [...(page.headlines ?? [])].sort(
      (a, b) => a.position - b.position,
    );
    const temperatures = [...(page.temperatures ?? [])].sort((a, b) =>
      a.temperature.name.localeCompare(b.temperature.name),
    );
    const versions = [...(page.versions ?? [])].sort(
      (a, b) => a.version_number - b.version_number,
    );

    return {
      id: page.id,
      abbreviation: page.abbreviation,
      name: page.name,
      launch_id: page.launch?.id ?? null,
      season_id: page.season?.id ?? null,
      form_id: page.form.id,
      form_version_id: page.form_version.id,
      active: page.active,
      headlines: headlines.map((headline) =>
        this.mapHeadlineResponse(headline),
      ),
      temperatures: temperatures.map((temperature) =>
        this.mapTemperatureResponse(temperature),
      ),
      versions: versions.map((version) => this.mapVersionResponse(version)),
      created_at: page.created_at.toISOString(),
      updated_at: page.updated_at.toISOString(),
    };
  }

  private mapHeadlineResponse(
    headline: PageHeadline,
  ): PageHeadlineResponseDto {
    return {
      id: headline.id,
      abbreviation: headline.abbreviation,
      content: headline.content,
      position: headline.position,
      active: headline.active,
      created_at: headline.created_at.toISOString(),
      updated_at: headline.updated_at.toISOString(),
    };
  }

  private mapTemperatureResponse(
    pageTemperature: PageTemperature,
  ): PageTemperatureResponseDto {
    return {
      id: pageTemperature.id,
      temperature_id: pageTemperature.temperature.id,
      temperature_abbreviation:
        pageTemperature.temperature.abbreviation ?? null,
      temperature_name: pageTemperature.temperature.name ?? null,
      tag_id: pageTemperature.tag_id,
      redirect_url: pageTemperature.redirect_url,
      active: pageTemperature.active,
      created_at: pageTemperature.created_at.toISOString(),
      updated_at: pageTemperature.updated_at.toISOString(),
    };
  }

  private mapVersionResponse(version: PageVersion): PageVersionResponseDto {
    return {
      id: version.id,
      abbreviation: version.abbreviation,
      version_number: version.version_number,
      template_image_url: version.template_image_url ?? null,
      template_url: version.template_url ?? null,
      active: version.active,
      created_at: version.created_at.toISOString(),
      updated_at: version.updated_at.toISOString(),
    };
  }
}
