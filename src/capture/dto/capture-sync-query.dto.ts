import { ApiPropertyOptional } from '@nestjs/swagger';
import { CaptureFilterQueryDto } from './capture-filter-query.dto';

export class CaptureSyncQueryDto extends CaptureFilterQueryDto {
  @ApiPropertyOptional({
    description:
      'Cursor: created_at do ultimo item recebido na chamada anterior. Deve vir junto com since_id.',
    example: '2026-07-01T12:00:00.000Z',
  })
  since_created_at?: string;

  @ApiPropertyOptional({
    description:
      'Cursor: id do ultimo item recebido na chamada anterior. Deve vir junto com since_created_at.',
    example: '0b2f5687-2cdf-4d95-81f9-7e97d6f0d6d2',
  })
  since_id?: string;

  @ApiPropertyOptional({
    description: 'Tamanho do lote. Default 500, maximo 2000.',
    example: '500',
  })
  limit?: string;

  @ApiPropertyOptional({
    description:
      'Mapeamento de perguntas do quiz para campos tratados na resposta, no formato ' +
      '"campo:question_key,campo2:question_key2". Exige launch_id preenchido. ' +
      'Use GET /capture/sync/launches/:launchId/questions para descobrir os question_key disponiveis.',
    example: 'faixa_etaria:q1,nivel_escolaridade:q2',
  })
  map?: string;
}
