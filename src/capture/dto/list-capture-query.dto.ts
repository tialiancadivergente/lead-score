import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CaptureFilterQueryDto } from './capture-filter-query.dto';

export class ListCaptureQueryDto extends CaptureFilterQueryDto {
  @ApiPropertyOptional({
    description: 'Pagina atual (inicia em 1).',
    example: '1',
    default: '1',
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de itens por pagina (padrao: 50, maximo: 200).',
    example: '50',
    default: '50',
  })
  @IsOptional()
  @IsString()
  per_page?: string;

  @ApiPropertyOptional({
    description: 'Campo para ordenacao.',
    example: 'created_at',
    default: 'created_at',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Direcao da ordenacao.',
    example: 'desc',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  order?: string;
}
