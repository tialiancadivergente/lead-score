import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const DATE_WITH_OPTIONAL_TIMEZONE_TIME =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/;

export class ListHubspotLeadsQueryDto {
  @ApiPropertyOptional({
    description: 'Campo de ordenacao: data de criacao ou ultima atualizacao.',
    enum: ['created_at', 'updated_at'],
    default: 'created_at',
  })
  @IsOptional()
  @IsIn(['created_at', 'updated_at'])
  sort_by?: 'created_at' | 'updated_at';

  @ApiPropertyOptional({
    description:
      'Direcao pelo campo sort_by: asc (mais antigos) ou desc (mais recentes).',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Cursor meta.next_after da resposta anterior. Preserve os filtros e a ordenacao.',
    example: '50',
    minimum: 0,
    maximum: 9999,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  after?: number;

  @ApiPropertyOptional({
    description:
      'Inicio inclusivo de createdate. YYYY-MM-DD em UTC ou datetime com fuso.',
    example: '2026-11-01',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_WITH_OPTIONAL_TIMEZONE_TIME)
  start_date?: string;

  @ApiPropertyOptional({
    description:
      'Fim inclusivo de createdate. YYYY-MM-DD inclui o dia inteiro em UTC; datetime exige fuso.',
    example: '2026-11-03',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_WITH_OPTIONAL_TIMEZONE_TIME)
  end_date?: string;

  @ApiPropertyOptional({
    description:
      'Valor interno do estagio do ciclo de vida. Sem filtro por padrao.',
    example: 'lead',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lifecyclestage?: string;

  @ApiPropertyOptional({
    description:
      'Valor interno do status comercial, por exemplo NEW ou IN_PROGRESS.',
    example: 'NEW',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  hs_lead_status?: string;

  @ApiPropertyOptional({ description: 'Filtro por email exato.' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({
    description:
      'Busca textual nativa do HubSpot, incluindo nome, email e telefone.',
    example: 'Maria',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q?: string;
}
