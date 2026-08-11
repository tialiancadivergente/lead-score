import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CaptureSyncApiKeyGuard } from '../common/guards/capture-sync-api-key.guard';
import { CaptureService } from './capture.service';
import { CaptureSyncQueryDto } from './dto/capture-sync-query.dto';
import { CaptureSyncResponseDto } from './dto/capture-sync-response.dto';
import { CaptureSyncQuestionsResponseDto } from './dto/capture-sync-questions-response.dto';

@ApiTags('Capture Sync')
@UseGuards(CaptureSyncApiKeyGuard)
@Controller('capture/sync')
export class CaptureSyncController {
  constructor(private readonly captureService: CaptureService) {}

  @Get('leads')
  @ApiOperation({
    summary:
      'Sincroniza leads/quiz de forma incremental (para consumo externo)',
    description:
      'Endpoint para consumo externo (ex: Google Apps Script), autenticado via header ' +
      'x-sync-api-key. Retorna leads em ordem crescente de created_at, com dados ja ' +
      'tratados (nome, email, telefone, launch, season, plataforma, estrategia, score, faixa). ' +
      'Use since_created_at + since_id (o next_cursor da resposta anterior) para trazer so ' +
      'os registros novos. Use "map" (exige launch_id) para trazer respostas especificas ' +
      'do quiz ja resolvidas como campos nomeados, ex: map=faixa_etaria:q1,nivel_escolaridade:q2.',
  })
  @ApiQuery({ name: 'launch_id', required: false })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiQuery({ name: 'temperature_id', required: false })
  @ApiQuery({ name: 'season_id', required: false })
  @ApiQuery({ name: 'quiz_answered', required: false })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'phone', required: false })
  @ApiQuery({ name: 'since_created_at', required: false })
  @ApiQuery({ name: 'since_id', required: false })
  @ApiQuery({ name: 'limit', required: false, example: '500' })
  @ApiQuery({
    name: 'map',
    required: false,
    example: 'faixa_etaria:q1,nivel_escolaridade:q2',
  })
  @ApiResponse({
    status: 200,
    description: 'Lote de leads retornado com sucesso.',
    type: CaptureSyncResponseDto,
  })
  async syncLeads(
    @Query() query: CaptureSyncQueryDto,
  ): Promise<CaptureSyncResponseDto> {
    return await this.captureService.listCapturesForSync(query);
  }

  @Get('launches/:launchId/questions')
  @ApiOperation({
    summary: 'Lista as perguntas de quiz efetivamente respondidas num launch',
    description:
      'Ajuda a montar o parametro "map" do endpoint de sync sem precisar consultar o banco na mao.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perguntas retornadas com sucesso.',
    type: CaptureSyncQuestionsResponseDto,
  })
  async getLaunchQuestions(
    @Param('launchId', new ParseUUIDPipe({ version: '4' })) launchId: string,
  ): Promise<CaptureSyncQuestionsResponseDto> {
    return await this.captureService.listAvailableQuizQuestions(launchId);
  }
}
