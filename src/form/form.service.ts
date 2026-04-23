import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Season } from '../database/entities/marketing/season.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { Form } from '../database/entities/form/form.entity';
import { CreateFormDto } from './dto/create-form.dto';
import { FormResponseDto } from './dto/form-response.dto';
import { ListFormQueryDto } from './dto/list-form-query.dto';
import { ListFormItemDto } from './dto/list-form-response.dto';
import { UpdateFormDto } from './dto/update-form.dto';

type FormRawRow = {
  id: string;
  name: string;
  type: string | null;
  launch_id: string | null;
  season_id: string | null;
};

@Injectable()
export class FormService {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    @InjectRepository(Form)
    private readonly formRepo: Repository<Form>,
    @InjectRepository(Launch)
    private readonly launchRepo: Repository<Launch>,
    @InjectRepository(Season)
    private readonly seasonRepo: Repository<Season>,
  ) {}

  async listAll(query: ListFormQueryDto): Promise<ListFormItemDto[]> {
    const launchId = this.parseOptionalUuid(query.launch_id, 'launch_id');
    const seasonId = this.parseOptionalUuid(query.season_id, 'season_id');
    const type = this.parseOptionalText(query.type);

    const qb = this.formRepo
      .createQueryBuilder('form')
      .select([
        'form.id AS id',
        'form.name AS name',
        'form.type AS type',
        'form.launch_id AS launch_id',
        'form.season_id AS season_id',
      ])
      .orderBy('form.name', 'ASC')
      .addOrderBy('form.id', 'ASC');

    if (launchId) {
      qb.andWhere('form.launch_id = :launchId', { launchId });
    }

    if (seasonId) {
      qb.andWhere('form.season_id = :seasonId', { seasonId });
    }

    if (type) {
      qb.andWhere('LOWER(form.type) = :type', { type: type.toLowerCase() });
    }

    const rows = await qb.getRawMany<FormRawRow>();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      launch_id: row.launch_id,
      season_id: row.season_id,
    }));
  }

  async findById(id: string): Promise<FormResponseDto> {
    const form = await this.formRepo.findOne({
      where: { id },
      relations: ['launch', 'season'],
    });

    if (!form) {
      throw new NotFoundException(`Form nao encontrado para id=${id}.`);
    }

    return this.mapResponse(form);
  }

  async create(dto: CreateFormDto): Promise<FormResponseDto> {
    const name = this.parseRequiredText(dto.name, 'name');
    const type = this.parseOptionalText(dto.type);
    const launchId = this.parseOptionalUuid(dto.launch_id, 'launch_id');
    const seasonId = this.parseOptionalUuid(dto.season_id, 'season_id');

    const launch = launchId ? await this.mustFindLaunchById(launchId) : undefined;
    const season = seasonId ? await this.mustFindSeasonById(seasonId) : undefined;
    this.assertLaunchSeasonConsistency(launch, season);

    const saved = await this.formRepo.save(
      this.formRepo.create({
        name,
        type,
        launch,
        season,
      }),
    );

    const created = await this.formRepo.findOne({
      where: { id: saved.id },
      relations: ['launch', 'season'],
    });

    if (!created) {
      throw new NotFoundException(`Form nao encontrado para id=${saved.id}.`);
    }

    return this.mapResponse(created);
  }

  async update(id: string, dto: UpdateFormDto): Promise<FormResponseDto> {
    const form = await this.formRepo.findOne({
      where: { id },
      relations: ['launch', 'season'],
    });

    if (!form) {
      throw new NotFoundException(`Form nao encontrado para id=${id}.`);
    }

    if (
      dto.name === undefined &&
      dto.type === undefined &&
      dto.launch_id === undefined &&
      dto.season_id === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao: name, type, launch_id ou season_id.',
      );
    }

    if (dto.name !== undefined) {
      form.name = this.parseRequiredText(dto.name, 'name');
    }

    if (dto.type !== undefined) {
      form.type = this.parseOptionalText(dto.type);
    }

    if (dto.launch_id !== undefined) {
      const launchId = this.parseRequiredUuid(dto.launch_id, 'launch_id');
      form.launch = await this.mustFindLaunchById(launchId);
    }

    if (dto.season_id !== undefined) {
      const seasonId = this.parseRequiredUuid(dto.season_id, 'season_id');
      form.season = await this.mustFindSeasonById(seasonId);
    }

    this.assertLaunchSeasonConsistency(form.launch, form.season);

    const saved = await this.formRepo.save(form);
    return this.mapResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.formRepo.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Form nao encontrado para id=${id}.`);
    }
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

  private parseOptionalUuid(
    value: string | undefined,
    fieldName: string,
  ): string | undefined {
    if (!value) return undefined;
    if (!FormService.UUID_REGEX.test(value)) {
      throw new BadRequestException(`${fieldName} deve ser um UUID valido.`);
    }
    return value;
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
    if (!FormService.UUID_REGEX.test(normalized)) {
      throw new BadRequestException(`${fieldName} deve ser um UUID valido.`);
    }
    return normalized;
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

  private mapResponse(form: Form): FormResponseDto {
    return {
      id: form.id,
      name: form.name,
      type: form.type ?? null,
      launch_id: form.launch?.id ?? null,
      season_id: form.season?.id ?? null,
      created_at: form.created_at.toISOString(),
      updated_at: form.updated_at.toISOString(),
    };
  }
}
