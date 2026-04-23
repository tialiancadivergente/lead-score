import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeadRegistrationUtmsDto {
  @ApiPropertyOptional() gc_id?: string;
  @ApiPropertyOptional() h_ad_id?: string;
  @ApiPropertyOptional() utm_source?: string;
  @ApiPropertyOptional() utm_medium?: string;
  @ApiPropertyOptional() utm_campaign?: string;
  @ApiPropertyOptional() utm_content?: string;
  @ApiPropertyOptional() utm_term?: string;
  @ApiPropertyOptional() utm_id?: string;
  @ApiPropertyOptional() target?: string;
  @ApiPropertyOptional() sck?: string;
  @ApiPropertyOptional() url?: string;
  @ApiPropertyOptional() gad_source?: string;
  @ApiPropertyOptional() gad_campaignid?: string;
  @ApiPropertyOptional() gclid?: string;
}

export class LeadRegistrationCookiesDto {
  @ApiPropertyOptional() _fbc?: string;
  @ApiPropertyOptional() _fbp?: string;
  @ApiPropertyOptional() _gcl_au?: string;
  @ApiPropertyOptional() _gcl_aw?: string;
  @ApiPropertyOptional() _ga?: string;
  @ApiPropertyOptional() ttclid?: string;
}

export class LeadRegistrationMetadadosDto {
  @ApiPropertyOptional() url?: string;
  @ApiPropertyOptional() referer?: string;
  @ApiPropertyOptional() ip?: string;
  @ApiPropertyOptional() user_agent?: string;

  @ApiPropertyOptional({ type: LeadRegistrationCookiesDto })
  cookies?: LeadRegistrationCookiesDto;

  // Relacionamentos (opcionais)
  @ApiPropertyOptional({
    description: 'Temperatura (abreviação).',
    enum: ['f', 'm', 'q', 'org'],
    example: 'm',
  })
  temperature?: 'f' | 'm' | 'q' | 'org';

  @ApiPropertyOptional({
    description: 'ID do form_version (uuid).',
    example: '12345678-1234-4567-890a-bcdef1234567',
  })
  form_version_id?: string;
}

export class LeadRegistrationPayloadDto {
  @ApiPropertyOptional({
    description: 'Nome do lead.',
    example: 'Fulano de Tal',
  })
  name?: string;

  @ApiProperty({
    description: 'Email do lead.',
    example: 'teste@gmail.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Telefone do lead (E.164 recomendado).',
    example: '+5554999889988',
  })
  telefone!: string;

  @ApiProperty({
    description: 'Código do launch (ex.: "ofrr").',
    example: 'ofrr',
  })
  launch!: string;

  @ApiProperty({
    description: 'Código da season dentro do launch (ex.: "nov25").',
    example: 'nov25',
  })
  season!: string;

  @ApiPropertyOptional({
    description: 'CPF do lead (apenas números ou formatado).',
    example: '123.456.789-09',
  })
  cpf?: string;

  @ApiPropertyOptional({ example: 'oresgatedosotimistas.com.br' })
  page?: string;

  @ApiPropertyOptional({ example: '/oro-v1-f/' })
  path?: string;

  @ApiPropertyOptional({ example: 'GGAds_' })
  utm_source?: string;

  @ApiPropertyOptional({ example: '23516292959' })
  utm_medium?: string;

  @ApiPropertyOptional({ example: '' })
  utm_campaign?: string;

  @ApiPropertyOptional({ example: '795195358998' })
  utm_content?: string;

  @ApiPropertyOptional({ example: '191765516639' })
  utm_term?: string;

  @ApiPropertyOptional({ example: '' })
  utm_id?: string;

  @ApiProperty({
    description: 'Identificador de tag (ex.: tag de campanha/segmento).',
    example: '120566',
  })
  tag_id!: string;

  @ApiPropertyOptional({ type: LeadRegistrationUtmsDto })
  utms?: LeadRegistrationUtmsDto;

  @ApiPropertyOptional({ type: LeadRegistrationMetadadosDto })
  metadados?: LeadRegistrationMetadadosDto;
}
