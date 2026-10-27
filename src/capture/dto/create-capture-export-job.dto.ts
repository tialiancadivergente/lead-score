import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { CaptureFilterQueryDto } from './capture-filter-query.dto';

export class CreateCaptureExportJobDto extends CaptureFilterQueryDto {
  @ApiProperty({
    description: 'Formato do arquivo gerado.',
    enum: ['csv', 'xlsx'],
    example: 'csv',
  })
  @IsIn(['csv', 'xlsx'])
  format!: 'csv' | 'xlsx';
}
