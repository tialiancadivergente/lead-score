import { ApiProperty } from '@nestjs/swagger';
import { PageHeadlineResponseDto } from './page-headline.dto';
import { PageTemperatureResponseDto } from './page-temperature.dto';
import { PageVersionResponseDto } from './page-version.dto';

export class PageResponseDto {
  @ApiProperty({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  id!: string;

  @ApiProperty({ example: 'p1' })
  abbreviation!: string;

  @ApiProperty({ example: 'Pagina de Captura - Lancamento X' })
  name!: string;

  @ApiProperty({ nullable: true, example: '4c88a392-6e6f-417e-822a-5be7221900fd' })
  launch_id!: string | null;

  @ApiProperty({ nullable: true, example: 'b2aee9b9-bb96-4cd7-b7e4-5fde7ac352de' })
  season_id!: string | null;

  @ApiProperty({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  form_id!: string;

  @ApiProperty({ example: '3f4ce227-9f54-4239-bb8d-0130fc0660f5' })
  form_version_id!: string;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ type: PageHeadlineResponseDto, isArray: true })
  headlines!: PageHeadlineResponseDto[];

  @ApiProperty({ type: PageTemperatureResponseDto, isArray: true })
  temperatures!: PageTemperatureResponseDto[];

  @ApiProperty({ type: PageVersionResponseDto, isArray: true })
  versions!: PageVersionResponseDto[];

  @ApiProperty({ example: '2026-06-10T12:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-06-10T12:00:00.000Z' })
  updated_at!: string;
}
