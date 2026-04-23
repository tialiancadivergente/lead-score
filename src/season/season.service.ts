import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Launch } from '../database/entities/marketing/launch.entity';
import { Season } from '../database/entities/marketing/season.entity';
import { CreateSeasonDto } from './dto/create-season.dto';
import { ListSeasonQueryDto } from './dto/list-season-query.dto';
import { ListSeasonItemDto } from './dto/list-season-response.dto';
import { SeasonResponseDto } from './dto/season-response.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';

type SeasonRawRow = {
  id: string;
  name: string;
  active: boolean;
  launch_id: string | null;
};

@Injectable()
export class SeasonService {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    @InjectRepository(Season)
    private readonly seasonRepo: Repository<Season>,
    @InjectRepository(Launch)
    private readonly launchRepo: Repository<Launch>,
  ) {}

  async listAll(query: ListSeasonQueryDto): Promise<ListSeasonItemDto[]> {
    const launchId = this.parseUuid(query.launch_id, 'launch_id');

    const qb = this.seasonRepo
      .createQueryBuilder('season')
      .select([
        'season.id AS id',
        'season.name AS name',
        'season.active AS active',
        'season.launch_id AS launch_id',
      ])
      .orderBy('season.name', 'ASC')
      .addOrderBy('season.id', 'ASC');

    if (launchId) {
      qb.where('season.launch_id = :launchId', { launchId });
    }

    const rows = await qb.getRawMany<SeasonRawRow>();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      active: this.parseRawBoolean(row.active),
      launch_id: row.launch_id,
    }));
  }

  async findById(id: string): Promise<SeasonResponseDto> {
    const season = await this.seasonRepo.findOne({
      where: { id },
      relations: ['launch'],
    });

    if (!season) {
      throw new NotFoundException(`Season nao encontrada para id=${id}.`);
    }

    return this.mapResponse(season);
  }

  async create(dto: CreateSeasonDto): Promise<SeasonResponseDto> {
    const name = this.parseRequiredText(dto.name, 'name');
    const active = this.parseOptionalBoolean(dto.active, 'active') ?? true;
    const launchId = this.parseRequiredUuid(dto.launch_id, 'launch_id');

    const launch = await this.mustFindLaunchById(launchId);

    const saved = await this.seasonRepo.save(
      this.seasonRepo.create({
        name,
        active,
        launch,
      }),
    );

    return this.mapResponse(saved);
  }

  async update(id: string, dto: UpdateSeasonDto): Promise<SeasonResponseDto> {
    const season = await this.seasonRepo.findOne({
      where: { id },
      relations: ['launch'],
    });

    if (!season) {
      throw new NotFoundException(`Season nao encontrada para id=${id}.`);
    }

    if (
      dto.name === undefined &&
      dto.active === undefined &&
      dto.launch_id === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao: name, active ou launch_id.',
      );
    }

    if (dto.name !== undefined) {
      season.name = this.parseRequiredText(dto.name, 'name');
    }

    if (dto.active !== undefined) {
      season.active = this.parseOptionalBoolean(dto.active, 'active') ?? true;
    }

    if (dto.launch_id !== undefined) {
      const launchId = this.parseRequiredUuid(dto.launch_id, 'launch_id');
      season.launch = await this.mustFindLaunchById(launchId);
    }

    const saved = await this.seasonRepo.save(season);
    return this.mapResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.seasonRepo.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Season nao encontrada para id=${id}.`);
    }
  }

  private parseUuid(
    value: string | undefined,
    fieldName: string,
  ): string | undefined {
    if (!value) return undefined;
    if (!SeasonService.UUID_REGEX.test(value)) {
      throw new BadRequestException(`${fieldName} deve ser um UUID valido.`);
    }
    return value;
  }

  private parseRequiredUuid(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} deve ser string.`);
    }
    const parsed = this.parseUuid(value, fieldName);
    if (!parsed) {
      throw new BadRequestException(`${fieldName} e obrigatorio.`);
    }
    return parsed;
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

  private parseOptionalBoolean(
    value: unknown,
    fieldName: string,
  ): boolean | undefined {
    if (value === undefined || value === null) return undefined;

    if (typeof value === 'boolean') return value;

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }

    throw new BadRequestException(
      `${fieldName} invalido. Use boolean true/false (ou 1/0).`,
    );
  }

  private parseRawBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
  }

  private async mustFindLaunchById(launchId: string): Promise<Launch> {
    const launch = await this.launchRepo.findOne({ where: { id: launchId } });
    if (!launch) {
      throw new NotFoundException(`Launch nao encontrado para id=${launchId}.`);
    }
    return launch;
  }

  private mapResponse(season: Season): SeasonResponseDto {
    return {
      id: season.id,
      name: season.name,
      active: season.active,
      launch_id: season.launch?.id ?? null,
      created_at: season.created_at.toISOString(),
      updated_at: season.updated_at.toISOString(),
    };
  }
}
