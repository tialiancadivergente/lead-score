import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Launch } from '../database/entities/marketing/launch.entity';
import { CreateLaunchDto } from './dto/create-launch.dto';
import { LaunchResponseDto } from './dto/launch-response.dto';
import { ListLaunchItemDto } from './dto/list-launch-response.dto';
import { UpdateLaunchDto } from './dto/update-launch.dto';

@Injectable()
export class LaunchService {
  constructor(
    @InjectRepository(Launch)
    private readonly launchRepo: Repository<Launch>,
  ) {}

  async listAll(): Promise<ListLaunchItemDto[]> {
    const rows = await this.launchRepo.find({
      select: { id: true, name: true, active: true },
      order: { name: 'ASC', id: 'ASC' },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      active: row.active,
    }));
  }

  async findById(id: string): Promise<LaunchResponseDto> {
    const launch = await this.launchRepo.findOne({ where: { id } });
    if (!launch) {
      throw new NotFoundException(`Launch nao encontrado para id=${id}.`);
    }

    return this.mapResponse(launch);
  }

  async create(dto: CreateLaunchDto): Promise<LaunchResponseDto> {
    const name = this.parseRequiredText(dto.name, 'name');
    const active = this.parseOptionalBoolean(dto.active, 'active') ?? true;

    const saved = await this.launchRepo.save(
      this.launchRepo.create({
        name,
        active,
      }),
    );

    return this.mapResponse(saved);
  }

  async update(id: string, dto: UpdateLaunchDto): Promise<LaunchResponseDto> {
    const launch = await this.launchRepo.findOne({ where: { id } });
    if (!launch) {
      throw new NotFoundException(`Launch nao encontrado para id=${id}.`);
    }

    if (dto.name === undefined && dto.active === undefined) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizacao: name ou active.',
      );
    }

    if (dto.name !== undefined) {
      launch.name = this.parseRequiredText(dto.name, 'name');
    }

    if (dto.active !== undefined) {
      launch.active = this.parseOptionalBoolean(dto.active, 'active') ?? true;
    }

    const saved = await this.launchRepo.save(launch);
    return this.mapResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.launchRepo.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Launch nao encontrado para id=${id}.`);
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

  private mapResponse(launch: Launch): LaunchResponseDto {
    return {
      id: launch.id,
      name: launch.name,
      active: launch.active,
      created_at: launch.created_at.toISOString(),
      updated_at: launch.updated_at.toISOString(),
    };
  }
}
