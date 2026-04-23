import { ApiPropertyOptional } from '@nestjs/swagger';
import { CaptureFilterQueryDto } from './capture-filter-query.dto';

export class ListCaptureQueryDto extends CaptureFilterQueryDto {
  @ApiPropertyOptional({
    description: 'Pagina atual (inicia em 1).',
    example: '1',
    default: '1',
  })
  page?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de itens por pagina (padrao: 50, maximo: 200).',
    example: '50',
    default: '50',
  })
  per_page?: string;
}
