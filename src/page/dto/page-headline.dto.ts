import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePageHeadlineDto {
  @ApiProperty({
    example: "<span style='color:#ff0000'>Headline principal</span>",
  })
  content!: string;

  @ApiPropertyOptional({ example: 1 })
  position?: number;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}

export class UpdatePageHeadlineDto {
  @ApiPropertyOptional({
    example: "<span style='color:#00aa55'>Headline atualizada</span>",
  })
  content?: string;

  @ApiPropertyOptional({ example: 2 })
  position?: number;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}

export class PageHeadlineResponseDto {
  @ApiProperty({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  id!: string;

  @ApiProperty({ example: 'h1' })
  abbreviation!: string;

  @ApiProperty({
    example: "<span style='color:#ff0000'>Headline principal</span>",
  })
  content!: string;

  @ApiProperty({ example: 1 })
  position!: number;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: '2026-06-10T12:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-06-10T12:00:00.000Z' })
  updated_at!: string;
}
