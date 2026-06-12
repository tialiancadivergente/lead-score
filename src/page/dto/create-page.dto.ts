import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePageHeadlineDto } from './page-headline.dto';
import { CreatePageTemperatureDto } from './page-temperature.dto';
import { CreatePageVersionDto } from './page-version.dto';

export class CreatePageDto {
  @ApiProperty({ example: 'Pagina de Captura - Lancamento X' })
  name!: string;

  @ApiPropertyOptional({
    example: '4c88a392-6e6f-417e-822a-5be7221900fd',
  })
  launch_id?: string;

  @ApiPropertyOptional({
    example: 'b2aee9b9-bb96-4cd7-b7e4-5fde7ac352de',
  })
  season_id?: string;

  @ApiProperty({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  form_id!: string;

  @ApiProperty({ example: '3f4ce227-9f54-4239-bb8d-0130fc0660f5' })
  form_version_id!: string;

  @ApiPropertyOptional({ example: true })
  active?: boolean;

  @ApiPropertyOptional({ type: CreatePageHeadlineDto, isArray: true })
  headlines?: CreatePageHeadlineDto[];

  @ApiPropertyOptional({ type: CreatePageTemperatureDto, isArray: true })
  temperatures?: CreatePageTemperatureDto[];

  @ApiPropertyOptional({ type: CreatePageVersionDto, isArray: true })
  versions?: CreatePageVersionDto[];
}
