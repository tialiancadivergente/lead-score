import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CaptureExportDownloadLinkDto {
  @ApiProperty({ enum: ['direct', 'api'] })
  mode!: 'direct' | 'api';

  @ApiProperty({
    description:
      'URL assinada do Blob, ou rota relativa autenticada quando mode=api.',
  })
  url!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Validade da URL, diferente da validade do arquivo.',
  })
  expires_at!: string | null;

  @ApiPropertyOptional({ nullable: true })
  file_name?: string | null;

  @ApiPropertyOptional({ nullable: true })
  file_size?: string | null;
}
