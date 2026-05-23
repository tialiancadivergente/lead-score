import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotmartProduct } from '../database/entities/hotmart/hotmart-product.entity';
import { Launch } from '../database/entities/marketing/launch.entity';

export interface CreateHotmartProductDto {
  launch_id?: string | null;
  name: string;
  product_id: number;
  active?: boolean;
}

export interface UpdateHotmartProductDto {
  launch_id?: string | null;
  name?: string;
  product_id?: number;
  active?: boolean;
}

@Injectable()
export class HotmartProductService {
  constructor(
    @InjectRepository(HotmartProduct)
    private readonly repo: Repository<HotmartProduct>,
    @InjectRepository(Launch)
    private readonly launchRepo: Repository<Launch>,
  ) {}

  async listAll() {
    const rows = await this.repo.find({
      relations: { launch: true },
      order: { name: 'ASC' },
    });
    return rows.map(this.mapRow);
  }

  async create(dto: CreateHotmartProductDto) {
    if (!dto.name?.trim()) throw new BadRequestException('name é obrigatório.');
    if (!dto.product_id || !Number.isInteger(Number(dto.product_id))) {
      throw new BadRequestException('product_id deve ser um inteiro positivo.');
    }

    if (dto.launch_id) await this.assertLaunchExists(dto.launch_id);

    const saved = await this.repo.save(
      this.repo.create({
        name: dto.name.trim(),
        product_id: Number(dto.product_id),
        active: dto.active ?? true,
        launch_id: dto.launch_id ?? null,
      }),
    );

    return this.mapRow(await this.repo.findOne({ where: { id: saved.id }, relations: { launch: true } }) ?? saved);
  }

  async update(id: string, dto: UpdateHotmartProductDto) {
    const row = await this.repo.findOne({ where: { id }, relations: { launch: true } });
    if (!row) throw new NotFoundException(`HotmartProduct id=${id} não encontrado.`);

    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new BadRequestException('name não pode ser vazio.');
      row.name = dto.name.trim();
    }
    if (dto.product_id !== undefined) {
      if (!Number.isInteger(Number(dto.product_id)) || Number(dto.product_id) <= 0) {
        throw new BadRequestException('product_id deve ser um inteiro positivo.');
      }
      row.product_id = Number(dto.product_id);
    }
    if (dto.active !== undefined) row.active = dto.active;
    if (dto.launch_id !== undefined) {
      if (dto.launch_id === null) {
        row.launch_id = null;
        row.launch = null;
      } else {
        const launch = await this.assertLaunchExists(dto.launch_id);
        row.launch_id = launch.id;
        row.launch = launch;
      }
    }

    const saved = await this.repo.save(row);
    return this.mapRow(await this.repo.findOne({ where: { id: saved.id }, relations: { launch: true } }) ?? saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete({ id });
    if (!result.affected) throw new NotFoundException(`HotmartProduct id=${id} não encontrado.`);
  }

  private async assertLaunchExists(launchId: string) {
    const exists = await this.launchRepo.findOne({ where: { id: launchId } });
    if (!exists) throw new BadRequestException(`Launch id=${launchId} não encontrado.`);
    return exists;
  }

  private mapRow(row: HotmartProduct) {
    return {
      id: row.id,
      launch_id: row.launch_id ?? null,
      launch_name: row.launch?.name ?? null,
      name: row.name,
      product_id: Number(row.product_id),
      active: row.active,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
  }
}
