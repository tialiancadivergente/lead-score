import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Temperature } from '../database/entities/marketing/temperature.entity';
import { ListTemperatureItemDto } from './dto/list-temperature-response.dto';

@Injectable()
export class TemperatureService {
  constructor(
    @InjectRepository(Temperature)
    private readonly temperatureRepo: Repository<Temperature>,
  ) {}

  async listAll(): Promise<ListTemperatureItemDto[]> {
    const rows = await this.temperatureRepo.find({
      select: { id: true, name: true, abbreviation: true },
      order: { name: 'ASC' },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation ?? null,
    }));
  }
}
