import { ApiPropertyOptional } from '@nestjs/swagger';

export class InleadActiveCampaignWebhookDto {
  @ApiPropertyOptional({
    description:
      'Email do lead quando os campos do formulario vierem direto no body.',
    example: 'teste@teste.com.br',
  })
  B02naZ?: string;

  @ApiPropertyOptional({
    description:
      'Telefone do lead quando os campos do formulario vierem direto no body.',
    example: '(54) 88888-8888',
  })
  os1ceK?: string;

  @ApiPropertyOptional({ example: '456' })
  utm_source?: string;

  @ApiPropertyOptional({ example: '789' })
  utm_medium?: string;

  @ApiPropertyOptional({ example: '321' })
  utm_campaign?: string;

  @ApiPropertyOptional({ example: '123' })
  utm_id?: string;

  @ApiPropertyOptional({ example: '654' })
  utm_term?: string;

  @ApiPropertyOptional({ example: '987' })
  utm_content?: string;

  @ApiPropertyOptional({
    description:
      'Envelope opcional do webhook. Quando presente, contem os campos enviados pelo formulario.',
    example: {
      B02naZ: 'teste@teste.com.br',
      os1ceK: '(54) 88888-8888',
      utm_source: '456',
      utm_medium: '789',
      utm_campaign: '321',
      utm_id: '123',
      utm_term: '654',
      utm_content: '987',
    },
  })
  body?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Headers opcionais no formato recebido por intermediadores como n8n.',
  })
  headers?: Record<string, any>;

  [key: string]: any;
}
