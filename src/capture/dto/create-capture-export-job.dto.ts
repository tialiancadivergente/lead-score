import { ApiProperty } from '@nestjs/swagger';
import { CaptureFilterQueryDto } from './capture-filter-query.dto';

export class CreateCaptureExportJobDto extends CaptureFilterQueryDto {
  @ApiProperty({
    description: 'Formato do arquivo gerado.',
    enum: ['csv', 'xlsx'],
    example: 'csv',
  })
  format!: 'csv' | 'xlsx';
}
