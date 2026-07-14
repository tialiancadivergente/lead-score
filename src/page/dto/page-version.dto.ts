import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePageVersionDto {
  @ApiPropertyOptional({ example: 'https://cdn.example.com/page-v1.png' })
  template_image_url?: string;

  @ApiPropertyOptional({ example: 'https://figma.com/file/example' })
  template_url?: string;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}

export class UpdatePageVersionDto {
  @ApiPropertyOptional({ example: 'https://cdn.example.com/page-v2.png' })
  template_image_url?: string;

  @ApiPropertyOptional({ example: 'https://figma.com/file/example-v2' })
  template_url?: string;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}

export class PageVersionResponseDto {
  @ApiProperty({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  id!: string;

  @ApiProperty({ example: 'v1' })
  abbreviation!: string;

  @ApiProperty({ example: 1 })
  version_number!: number;

  @ApiProperty({
    nullable: true,
    example: 'https://cdn.example.com/page-v1.png',
  })
  template_image_url!: string | null;

  @ApiProperty({ nullable: true, example: 'https://figma.com/file/example' })
  template_url!: string | null;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: '2026-06-10T12:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-06-10T12:00:00.000Z' })
  updated_at!: string;
}
