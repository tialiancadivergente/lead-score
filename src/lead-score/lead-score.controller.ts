import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LeadScoreService } from './lead-score.service';
import { LeadScoreActiveCampaignService } from './services/activecampaign.service';
import { LeadScorePersistenceService } from './services/lead-score-persistence.service';
import { LeadScorePayloadDto } from './dto/lead-score-payload.dto';
import { RequireLeadScoreFieldsPipe } from './pipes/require-lead-score-fields.pipe';
import { GetLeadScoreQuestionsResponseDto } from './dto/get-lead-score-questions.dto';
import { LeadScoreQuestionsService } from './services/lead-score-questions.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('Lead Score')
@ApiHeader({
  name: 'x-api-key',
  required: false,
  description:
    'API key interna. Obrigatoria quando API_KEY_ENABLED=true no backend.',
})
@UseGuards(ApiKeyGuard)
@Controller('lead-score')
export class LeadScoreController {
  constructor(
    private readonly leadScore: LeadScoreService,
    private readonly activeCampaign: LeadScoreActiveCampaignService,
    private readonly persistence: LeadScorePersistenceService,
    private readonly questions: LeadScoreQuestionsService,
  ) {}

  @Get('questions/:formVersionId')
  @ApiOperation({
    summary: 'Lista perguntas e opcoes por form_version_id',
    description:
      'Retorna as perguntas da versao do formulario com tipo, obrigatoriedade e opcoes ordenadas para renderizacao no frontend.',
  })
  @ApiParam({
    name: 'formVersionId',
    description: 'ID da versao do formulario.',
    example: '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0',
  })
  @ApiResponse({
    status: 200,
    description: 'Perguntas carregadas com sucesso',
    type: GetLeadScoreQuestionsResponseDto,
  })
  async listQuestions(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
  ) {
    return await this.questions.listByFormVersion(formVersionId);
  }

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Enfileira o processamento do quiz de lead score',
    description:
      'Endpoint start: coloca uma mensagem na fila de lead score. O consumer processa em background (banco de dados).',
  })
  @ApiBody({ type: LeadScorePayloadDto })
  @ApiResponse({ status: 202, description: 'Mensagem enfileirada' })
  async start(
    @Body(new RequireLeadScoreFieldsPipe()) dto: LeadScorePayloadDto,
  ) {
    return await this.leadScore.enqueueLeadScore(dto as Record<string, any>);
  }

  @Post('activecampaign')
  @ApiOperation({
    summary: 'Envia respostas do quiz para ActiveCampaign (manual)',
    description: 'Endpoint auxiliar para testes/uso manual.',
  })
  @ApiBody({ type: LeadScorePayloadDto })
  @ApiResponse({ status: 201, description: 'Processado no ActiveCampaign' })
  async registerInActiveCampaign(
    @Body(new RequireLeadScoreFieldsPipe())
    dto: LeadScorePayloadDto,
  ) {
    return await this.activeCampaign.createContact(dto as Record<string, any>);
  }

  @Post('database')
  @ApiOperation({
    summary: 'Persiste respostas e resultado do lead score no banco (manual)',
    description:
      'Endpoint auxiliar para testes. Persiste form_response, form_answer e leadscore_result.',
  })
  @ApiBody({ type: LeadScorePayloadDto })
  @ApiResponse({ status: 201, description: 'Lead score persistido no banco' })
  async registerInDatabase(
    @Body(new RequireLeadScoreFieldsPipe())
    dto: LeadScorePayloadDto,
  ) {
    return await this.persistence.persistLeadScore(dto as Record<string, any>);
  }
}
