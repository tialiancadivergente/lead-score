import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
  AddFormVersionQuestionDto,
  CreateFormVersionDto,
  FormVersionQuestionResponseDto,
  FormVersionResponseDto,
  ReorderFormVersionQuestionsDto,
  UpdateFormVersionDto,
  UpdateFormVersionQuestionDto,
} from './dto/form-version-management.dto';
import {
  CreateQuestionDto,
  CreateQuestionOptionDto,
  QuestionOptionResponseDto,
  QuestionResponseDto,
  UpdateQuestionDto,
  UpdateQuestionOptionDto,
} from './dto/question-management.dto';
import {
  CreateLeadscoreDto,
  LeadscoreOptionPointResponseDto,
  LeadscoreRangePointResponseDto,
  LeadscoreResponseDto,
  LeadscoreTierRuleResponseDto,
  ReplaceLeadscoreOptionPointsDto,
  ReplaceLeadscoreRangePointsDto,
  ReplaceLeadscoreTierRulesDto,
  UpdateLeadscoreDto,
} from './dto/score-management.dto';
import {
  CreateFullFormPayloadDto,
  CreateFullFormResponseDto,
} from './dto/create-full-form.dto';
import {
  CloneFormPayloadDto,
  CloneFormResponseDto,
} from './dto/clone-form.dto';
import { FormManagementService } from './form-management.service';

@ApiTags('Form Management')
@ApiHeader({
  name: 'x-api-key',
  required: false,
  description:
    'API key interna. Obrigatoria quando API_KEY_ENABLED=true no backend.',
})
@UseGuards(ApiKeyGuard, JwtAuthGuard, PermissionGuard)
@RequirePermission('forms', 'view')
@Controller('form')
export class FormManagementController {
  constructor(private readonly service: FormManagementService) {}

  @Get(':formId/versions')
  @ApiOperation({ summary: 'Lista versoes do form' })
  @ApiResponse({ status: 200, type: FormVersionResponseDto, isArray: true })
  async listVersions(
    @Param('formId', new ParseUUIDPipe({ version: '4' })) formId: string,
  ) {
    return await this.service.listVersions(formId);
  }

  @Get('versions/:formVersionId')
  @ApiOperation({ summary: 'Busca versao por id' })
  @ApiResponse({ status: 200, type: FormVersionResponseDto })
  async findVersionById(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
  ) {
    return await this.service.findVersionById(formVersionId);
  }

  @Post(':formId/versions')
  @RequirePermission('forms', 'create')
  @ApiOperation({ summary: 'Cria versao de form' })
  @ApiBody({ type: CreateFormVersionDto })
  @ApiResponse({ status: 201, type: FormVersionResponseDto })
  async createVersion(
    @Param('formId', new ParseUUIDPipe({ version: '4' })) formId: string,
    @Body() dto: CreateFormVersionDto,
  ) {
    return await this.service.createVersion(formId, dto);
  }

  @Patch('versions/:formVersionId')
  @RequirePermission('forms', 'update')
  @ApiOperation({ summary: 'Atualiza versao de form' })
  @ApiBody({ type: UpdateFormVersionDto })
  @ApiResponse({ status: 200, type: FormVersionResponseDto })
  async updateVersion(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
    @Body() dto: UpdateFormVersionDto,
  ) {
    return await this.service.updateVersion(formVersionId, dto);
  }

  @Post('versions/:formVersionId/activate')
  @RequirePermission('forms', 'update')
  @ApiOperation({ summary: 'Ativa versao de form' })
  @ApiResponse({ status: 200, type: FormVersionResponseDto })
  async activateVersion(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
  ) {
    return await this.service.activateVersion(formVersionId);
  }

  @Delete('versions/:formVersionId')
  @RequirePermission('forms', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove versao de form' })
  @ApiResponse({ status: 204 })
  async removeVersion(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
  ) {
    await this.service.removeVersion(formVersionId);
  }

  @Get(':formId/questions')
  @ApiOperation({ summary: 'Lista perguntas do form' })
  @ApiResponse({ status: 200, type: QuestionResponseDto, isArray: true })
  async listQuestions(
    @Param('formId', new ParseUUIDPipe({ version: '4' })) formId: string,
  ) {
    return await this.service.listQuestions(formId);
  }

  @Get('questions/:questionId')
  @ApiOperation({ summary: 'Busca pergunta por id' })
  @ApiResponse({ status: 200, type: QuestionResponseDto })
  async findQuestionById(
    @Param('questionId', new ParseUUIDPipe({ version: '4' }))
    questionId: string,
  ) {
    return await this.service.findQuestionById(questionId);
  }

  @Post(':formId/questions')
  @RequirePermission('forms', 'create')
  @ApiOperation({ summary: 'Cria pergunta no form' })
  @ApiBody({ type: CreateQuestionDto })
  @ApiResponse({ status: 201, type: QuestionResponseDto })
  async createQuestion(
    @Param('formId', new ParseUUIDPipe({ version: '4' })) formId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return await this.service.createQuestion(formId, dto);
  }

  @Patch('questions/:questionId')
  @RequirePermission('forms', 'update')
  @ApiOperation({ summary: 'Atualiza pergunta' })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiResponse({ status: 200, type: QuestionResponseDto })
  async updateQuestion(
    @Param('questionId', new ParseUUIDPipe({ version: '4' }))
    questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return await this.service.updateQuestion(questionId, dto);
  }

  @Delete('questions/:questionId')
  @RequirePermission('forms', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove pergunta' })
  @ApiResponse({ status: 204 })
  async removeQuestion(
    @Param('questionId', new ParseUUIDPipe({ version: '4' }))
    questionId: string,
  ) {
    await this.service.removeQuestion(questionId);
  }

  @Get('questions/:questionId/options')
  @ApiOperation({ summary: 'Lista opcoes da pergunta' })
  @ApiResponse({ status: 200, type: QuestionOptionResponseDto, isArray: true })
  async listQuestionOptions(
    @Param('questionId', new ParseUUIDPipe({ version: '4' }))
    questionId: string,
  ) {
    return await this.service.listQuestionOptions(questionId);
  }

  @Post('questions/:questionId/options')
  @RequirePermission('forms', 'create')
  @ApiOperation({ summary: 'Cria opcao da pergunta' })
  @ApiBody({ type: CreateQuestionOptionDto })
  @ApiResponse({ status: 201, type: QuestionOptionResponseDto })
  async createQuestionOption(
    @Param('questionId', new ParseUUIDPipe({ version: '4' }))
    questionId: string,
    @Body() dto: CreateQuestionOptionDto,
  ) {
    return await this.service.createQuestionOption(questionId, dto);
  }

  @Patch('options/:optionId')
  @RequirePermission('forms', 'update')
  @ApiOperation({ summary: 'Atualiza opcao da pergunta' })
  @ApiBody({ type: UpdateQuestionOptionDto })
  @ApiResponse({ status: 200, type: QuestionOptionResponseDto })
  async updateQuestionOption(
    @Param('optionId', new ParseUUIDPipe({ version: '4' })) optionId: string,
    @Body() dto: UpdateQuestionOptionDto,
  ) {
    return await this.service.updateQuestionOption(optionId, dto);
  }

  @Delete('options/:optionId')
  @RequirePermission('forms', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove opcao da pergunta' })
  @ApiResponse({ status: 204 })
  async removeQuestionOption(
    @Param('optionId', new ParseUUIDPipe({ version: '4' })) optionId: string,
  ) {
    await this.service.removeQuestionOption(optionId);
  }

  @Get('versions/:formVersionId/questions')
  @ApiOperation({ summary: 'Lista perguntas vinculadas a versao' })
  @ApiResponse({
    status: 200,
    type: FormVersionQuestionResponseDto,
    isArray: true,
  })
  async listFormVersionQuestions(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
  ) {
    return await this.service.listFormVersionQuestions(formVersionId);
  }

  @Post('versions/:formVersionId/questions')
  @RequirePermission('forms', 'create')
  @ApiOperation({ summary: 'Vincula pergunta a versao' })
  @ApiBody({ type: AddFormVersionQuestionDto })
  @ApiResponse({ status: 201, type: FormVersionQuestionResponseDto })
  async addFormVersionQuestion(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
    @Body() dto: AddFormVersionQuestionDto,
  ) {
    return await this.service.addFormVersionQuestion(formVersionId, dto);
  }

  @Patch('versions/:formVersionId/questions/:questionId')
  @RequirePermission('forms', 'update')
  @ApiOperation({ summary: 'Atualiza vinculo pergunta x versao' })
  @ApiBody({ type: UpdateFormVersionQuestionDto })
  @ApiResponse({ status: 200, type: FormVersionQuestionResponseDto })
  async updateFormVersionQuestion(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
    @Param('questionId', new ParseUUIDPipe({ version: '4' }))
    questionId: string,
    @Body() dto: UpdateFormVersionQuestionDto,
  ) {
    return await this.service.updateFormVersionQuestion(
      formVersionId,
      questionId,
      dto,
    );
  }

  @Delete('versions/:formVersionId/questions/:questionId')
  @RequirePermission('forms', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove vinculo pergunta x versao' })
  @ApiResponse({ status: 204 })
  async removeFormVersionQuestion(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
    @Param('questionId', new ParseUUIDPipe({ version: '4' }))
    questionId: string,
  ) {
    await this.service.removeFormVersionQuestion(formVersionId, questionId);
  }

  @Put('versions/:formVersionId/questions/reorder')
  @RequirePermission('forms', 'update')
  @ApiOperation({ summary: 'Reordena perguntas da versao' })
  @ApiBody({ type: ReorderFormVersionQuestionsDto })
  @ApiResponse({
    status: 200,
    type: FormVersionQuestionResponseDto,
    isArray: true,
  })
  async reorderFormVersionQuestions(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
    @Body() dto: ReorderFormVersionQuestionsDto,
  ) {
    return await this.service.reorderFormVersionQuestions(formVersionId, dto);
  }

  @Get('versions/:formVersionId/scores')
  @ApiOperation({ summary: 'Lista lead scores da versao' })
  @ApiResponse({ status: 200, type: LeadscoreResponseDto, isArray: true })
  async listScores(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
  ) {
    return await this.service.listScores(formVersionId);
  }

  @Post('versions/:formVersionId/scores')
  @RequirePermission('forms', 'create')
  @ApiOperation({ summary: 'Cria lead score da versao' })
  @ApiBody({ type: CreateLeadscoreDto })
  @ApiResponse({ status: 201, type: LeadscoreResponseDto })
  async createScore(
    @Param('formVersionId', new ParseUUIDPipe({ version: '4' }))
    formVersionId: string,
    @Body() dto: CreateLeadscoreDto,
  ) {
    return await this.service.createScore(formVersionId, dto);
  }

  @Patch('scores/:leadscoreId')
  @RequirePermission('forms', 'update')
  @ApiOperation({ summary: 'Atualiza lead score' })
  @ApiBody({ type: UpdateLeadscoreDto })
  @ApiResponse({ status: 200, type: LeadscoreResponseDto })
  async updateScore(
    @Param('leadscoreId', new ParseUUIDPipe({ version: '4' }))
    leadscoreId: string,
    @Body() dto: UpdateLeadscoreDto,
  ) {
    return await this.service.updateScore(leadscoreId, dto);
  }

  @Post('scores/:leadscoreId/activate')
  @RequirePermission('forms', 'update')
  @ApiOperation({ summary: 'Ativa lead score' })
  @ApiResponse({ status: 200, type: LeadscoreResponseDto })
  async activateScore(
    @Param('leadscoreId', new ParseUUIDPipe({ version: '4' }))
    leadscoreId: string,
  ) {
    return await this.service.activateScore(leadscoreId);
  }

  @Delete('scores/:leadscoreId')
  @RequirePermission('forms', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove lead score' })
  @ApiResponse({ status: 204 })
  async removeScore(
    @Param('leadscoreId', new ParseUUIDPipe({ version: '4' }))
    leadscoreId: string,
  ) {
    await this.service.removeScore(leadscoreId);
  }

  @Get('scores/:leadscoreId/option-points')
  @ApiOperation({ summary: 'Lista pontos por opcao' })
  @ApiResponse({
    status: 200,
    type: LeadscoreOptionPointResponseDto,
    isArray: true,
  })
  async listScoreOptionPoints(
    @Param('leadscoreId', new ParseUUIDPipe({ version: '4' }))
    leadscoreId: string,
  ) {
    return await this.service.listScoreOptionPoints(leadscoreId);
  }

  @Put('scores/:leadscoreId/option-points')
  @RequirePermission('forms', 'update')
  @ApiOperation({ summary: 'Substitui pontos por opcao' })
  @ApiBody({ type: ReplaceLeadscoreOptionPointsDto })
  @ApiResponse({
    status: 200,
    type: LeadscoreOptionPointResponseDto,
    isArray: true,
  })
  async replaceScoreOptionPoints(
    @Param('leadscoreId', new ParseUUIDPipe({ version: '4' }))
    leadscoreId: string,
    @Body() dto: ReplaceLeadscoreOptionPointsDto,
  ) {
    return await this.service.replaceScoreOptionPoints(leadscoreId, dto);
  }

  @Get('scores/:leadscoreId/range-points')
  @ApiOperation({ summary: 'Lista pontos por faixa' })
  @ApiResponse({
    status: 200,
    type: LeadscoreRangePointResponseDto,
    isArray: true,
  })
  async listScoreRangePoints(
    @Param('leadscoreId', new ParseUUIDPipe({ version: '4' }))
    leadscoreId: string,
  ) {
    return await this.service.listScoreRangePoints(leadscoreId);
  }

  @Put('scores/:leadscoreId/range-points')
  @RequirePermission('forms', 'update')
  @ApiOperation({ summary: 'Substitui pontos por faixa' })
  @ApiBody({ type: ReplaceLeadscoreRangePointsDto })
  @ApiResponse({
    status: 200,
    type: LeadscoreRangePointResponseDto,
    isArray: true,
  })
  async replaceScoreRangePoints(
    @Param('leadscoreId', new ParseUUIDPipe({ version: '4' }))
    leadscoreId: string,
    @Body() dto: ReplaceLeadscoreRangePointsDto,
  ) {
    return await this.service.replaceScoreRangePoints(leadscoreId, dto);
  }

  @Get('scores/:leadscoreId/tier-rules')
  @ApiOperation({ summary: 'Lista regras de tier do lead score' })
  @ApiResponse({
    status: 200,
    type: LeadscoreTierRuleResponseDto,
    isArray: true,
  })
  async listScoreTierRules(
    @Param('leadscoreId', new ParseUUIDPipe({ version: '4' }))
    leadscoreId: string,
  ) {
    return await this.service.listScoreTierRules(leadscoreId);
  }

  @Put('scores/:leadscoreId/tier-rules')
  @RequirePermission('forms', 'update')
  @ApiOperation({ summary: 'Substitui regras de tier do lead score' })
  @ApiBody({ type: ReplaceLeadscoreTierRulesDto })
  @ApiResponse({
    status: 200,
    type: LeadscoreTierRuleResponseDto,
    isArray: true,
  })
  async replaceScoreTierRules(
    @Param('leadscoreId', new ParseUUIDPipe({ version: '4' }))
    leadscoreId: string,
    @Body() dto: ReplaceLeadscoreTierRulesDto,
  ) {
    return await this.service.replaceScoreTierRules(leadscoreId, dto);
  }

  @Post('clone')
  @RequirePermission('forms', 'create')
  @ApiOperation({
    summary: 'Duplica perguntas, opcoes e lead score de uma versao para outra',
  })
  @ApiBody({ type: CloneFormPayloadDto })
  @ApiResponse({ status: 201, type: CloneFormResponseDto })
  async clone(@Body() payload: CloneFormPayloadDto) {
    return await this.service.clone(payload);
  }

  @Post('full')
  @RequirePermission('forms', 'create')
  @ApiOperation({
    summary: 'Cria formulario completo em transacao unica',
  })
  @ApiBody({ type: CreateFullFormPayloadDto })
  @ApiResponse({ status: 201, type: CreateFullFormResponseDto })
  async createFull(@Body() payload: CreateFullFormPayloadDto) {
    return await this.service.createFull(payload);
  }
}
