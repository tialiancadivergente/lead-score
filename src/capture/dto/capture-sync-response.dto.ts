import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaptureListItemDto } from './list-capture-response.dto';

export class CaptureSyncCursorDto {
  @ApiProperty({ example: '2026-07-01T12:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '0b2f5687-2cdf-4d95-81f9-7e97d6f0d6d2' })
  id!: string;
}

export class CaptureSyncResponseDto {
  @ApiProperty({
    type: CaptureListItemDto,
    isArray: true,
    description:
      'Cada item tem os mesmos campos de CaptureListItemDto, mais um campo extra por ' +
      'entrada do parametro "map" (ex: faixa_etaria, nivel_escolaridade), com o valor ' +
      'da resposta correspondente ou null se o lead nao respondeu aquela pergunta.',
  })
  items!: Array<CaptureListItemDto & Record<string, string | null>>;

  @ApiPropertyOptional({ type: CaptureSyncCursorDto, nullable: true })
  next_cursor!: { created_at: string; id: string } | null;

  @ApiProperty({
    description:
      'true se ainda ha mais registros alem deste lote (chame de novo com o next_cursor).',
  })
  has_more!: boolean;
}
