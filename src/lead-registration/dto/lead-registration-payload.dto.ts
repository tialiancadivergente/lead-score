import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class LeadRegistrationUtmsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gc_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  h_ad_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utm_source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utm_medium?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utm_campaign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utm_content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utm_term?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utm_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  target?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sck?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gad_source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gad_campaignid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gclid?: string;
}

export class LeadRegistrationCookiesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _fbc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _fbp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _gcl_au?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _gcl_aw?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _ga?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ttclid?: string;
}

export class LeadRegistrationMetadadosDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user_agent?: string;

  @ApiPropertyOptional({ type: LeadRegistrationCookiesDto })
  @IsOptional()
  @IsObject()
  cookies?: LeadRegistrationCookiesDto;

  @ApiPropertyOptional({
    description: 'Temperature abbreviation.',
    enum: ['f', 'm', 'q', 'org'],
    example: 'm',
  })
  @IsOptional()
  @IsString()
  temperature?: 'f' | 'm' | 'q' | 'org';

  @ApiPropertyOptional({
    description: 'form_version id (uuid).',
    example: '12345678-1234-4567-890a-bcdef1234567',
  })
  @IsOptional()
  @IsString()
  form_version_id?: string;
}

export class LeadRegistrationPayloadDto {
  @ApiPropertyOptional({
    description: 'Lead name.',
    example: 'Fulano de Tal',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Lead email.',
    example: 'teste@gmail.com',
  })
  @IsString()
  email!: string;

  @ApiProperty({
    description: 'Lead phone. E.164 is recommended.',
    example: '+5554999889988',
  })
  @IsString()
  telefone!: string;

  @ApiProperty({
    description: 'Launch code, for example "ofrr".',
    example: 'ofrr',
  })
  @IsString()
  launch!: string;

  @ApiProperty({
    description: 'Season code inside the launch, for example "nov25".',
    example: 'nov25',
  })
  @IsString()
  season!: string;

  @ApiPropertyOptional({
    description: 'Lead CPF, digits only or formatted.',
    example: '123.456.789-09',
  })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({ example: 'oresgatedosotimistas.com.br' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '/oro-v1-f/' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ example: 'GGAds_' })
  @IsOptional()
  @IsString()
  utm_source?: string;

  @ApiPropertyOptional({ example: '23516292959' })
  @IsOptional()
  @IsString()
  utm_medium?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  utm_campaign?: string;

  @ApiPropertyOptional({ example: '795195358998' })
  @IsOptional()
  @IsString()
  utm_content?: string;

  @ApiPropertyOptional({ example: '191765516639' })
  @IsOptional()
  @IsString()
  utm_term?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  utm_id?: string;

  @ApiProperty({
    description: 'Tag identifier, for example a campaign or segment tag.',
    example: '120566',
  })
  @IsString()
  tag_id!: string;

  @ApiPropertyOptional({ type: LeadRegistrationUtmsDto })
  @IsOptional()
  @IsObject()
  utms?: LeadRegistrationUtmsDto;

  @ApiPropertyOptional({ type: LeadRegistrationMetadadosDto })
  @IsOptional()
  @IsObject()
  metadados?: LeadRegistrationMetadadosDto;

  @ApiPropertyOptional({
    description:
      'Compatibility alias for clients that send metadata instead of metadados.',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
