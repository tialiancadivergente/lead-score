import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Ip,
  Headers,
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
import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
  AdminVotingCampaignListItemDto,
  AdminVotingCampaignResponseDto,
} from './dto/admin-voting-campaign-response.dto';
import { AdminVotingCandidateResponseDto } from './dto/admin-voting-candidate-response.dto';
import { AdminVotingCategoryResponseDto } from './dto/admin-voting-category-response.dto';
import { CreateVotingCampaignDto } from './dto/create-voting-campaign.dto';
import { CreateVotingCandidateDto } from './dto/create-voting-candidate.dto';
import { CreateVotingCategoryDto } from './dto/create-voting-category.dto';
import { UpdateVotingCampaignDto } from './dto/update-voting-campaign.dto';
import { UpdateVotingCandidateDto } from './dto/update-voting-candidate.dto';
import { UpdateVotingCategoryDto } from './dto/update-voting-category.dto';
import { VotingCampaignResultsResponseDto } from './dto/voting-campaign-results-response.dto';
import { VotingService } from './voting.service';

@ApiTags('Voting Admin')
@ApiHeader({
  name: 'x-api-key',
  required: false,
  description:
    'API key interna. Obrigatoria quando API_KEY_ENABLED=true no backend.',
})
@UseGuards(ApiKeyGuard, JwtAuthGuard, PermissionGuard)
@RequirePermission('vote_campaigns', 'view')
@Controller('v1/voting/admin')
export class VotingAdminController {
  constructor(
    private readonly votingService: VotingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('campaigns')
  @RequirePermission('vote_campaigns', 'create')
  @ApiOperation({ summary: 'Cria campanha de votacao' })
  @ApiBody({ type: CreateVotingCampaignDto })
  @ApiResponse({ status: 201, type: AdminVotingCampaignResponseDto })
  async createCampaign(
    @Body() dto: CreateVotingCampaignDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.votingService.createCampaign(dto);
    await this.recordVotingAudit('voting_campaign_created', actor, ip, result.id, {
      userAgent,
      after: result,
    });
    return result;
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Lista campanhas com totais' })
  @ApiResponse({
    status: 200,
    type: AdminVotingCampaignListItemDto,
    isArray: true,
  })
  async listCampaigns() {
    return await this.votingService.listCampaigns();
  }

  @Patch('campaigns/:campaignId')
  @RequirePermission('vote_campaigns', 'update')
  @ApiOperation({ summary: 'Atualiza campanha' })
  @ApiBody({ type: UpdateVotingCampaignDto })
  @ApiResponse({ status: 200, type: AdminVotingCampaignResponseDto })
  async updateCampaign(
    @Param('campaignId', new ParseUUIDPipe({ version: '4' }))
    campaignId: string,
    @Body() dto: UpdateVotingCampaignDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.votingService.updateCampaign(campaignId, dto);
    await this.recordVotingAudit(
      'voting_campaign_updated',
      actor,
      ip,
      campaignId,
      { userAgent, payload: dto, after: result },
    );
    return result;
  }

  @Post('campaigns/:campaignId/categories')
  @RequirePermission('vote_campaigns', 'create')
  @ApiOperation({ summary: 'Cria categoria da campanha' })
  @ApiBody({ type: CreateVotingCategoryDto })
  @ApiResponse({ status: 201, type: AdminVotingCategoryResponseDto })
  async createCategory(
    @Param('campaignId', new ParseUUIDPipe({ version: '4' }))
    campaignId: string,
    @Body() dto: CreateVotingCategoryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.votingService.createCategory(campaignId, dto);
    await this.recordVotingAudit('voting_category_created', actor, ip, result.id, {
      userAgent,
      campaignId,
      after: result,
    });
    return result;
  }

  @Get('campaigns/:campaignId/categories')
  @ApiOperation({ summary: 'Lista categorias da campanha' })
  @ApiResponse({
    status: 200,
    type: AdminVotingCategoryResponseDto,
    isArray: true,
  })
  async listCategories(
    @Param('campaignId', new ParseUUIDPipe({ version: '4' }))
    campaignId: string,
  ) {
    return await this.votingService.listCategories(campaignId);
  }

  @Patch('categories/:categoryId')
  @RequirePermission('vote_campaigns', 'update')
  @ApiOperation({ summary: 'Atualiza categoria' })
  @ApiBody({ type: UpdateVotingCategoryDto })
  @ApiResponse({ status: 200, type: AdminVotingCategoryResponseDto })
  async updateCategory(
    @Param('categoryId', new ParseUUIDPipe({ version: '4' }))
    categoryId: string,
    @Body() dto: UpdateVotingCategoryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.votingService.updateCategory(categoryId, dto);
    await this.recordVotingAudit(
      'voting_category_updated',
      actor,
      ip,
      categoryId,
      { userAgent, payload: dto, after: result },
    );
    return result;
  }

  @Post('campaigns/:campaignId/candidates')
  @RequirePermission('vote_campaigns', 'create')
  @ApiOperation({ summary: 'Cria candidato da campanha' })
  @ApiBody({ type: CreateVotingCandidateDto })
  @ApiResponse({ status: 201, type: AdminVotingCandidateResponseDto })
  async createCandidate(
    @Param('campaignId', new ParseUUIDPipe({ version: '4' }))
    campaignId: string,
    @Body() dto: CreateVotingCandidateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.votingService.createCandidate(campaignId, dto);
    await this.recordVotingAudit('voting_candidate_created', actor, ip, result.id, {
      userAgent,
      campaignId,
      after: result,
    });
    return result;
  }

  @Get('campaigns/:campaignId/candidates')
  @ApiOperation({ summary: 'Lista candidatos da campanha' })
  @ApiResponse({
    status: 200,
    type: AdminVotingCandidateResponseDto,
    isArray: true,
  })
  async listCandidates(
    @Param('campaignId', new ParseUUIDPipe({ version: '4' }))
    campaignId: string,
  ) {
    return await this.votingService.listCandidates(campaignId);
  }

  @Patch('candidates/:candidateId')
  @RequirePermission('vote_campaigns', 'update')
  @ApiOperation({ summary: 'Atualiza candidato' })
  @ApiBody({ type: UpdateVotingCandidateDto })
  @ApiResponse({ status: 200, type: AdminVotingCandidateResponseDto })
  async updateCandidate(
    @Param('candidateId', new ParseUUIDPipe({ version: '4' }))
    candidateId: string,
    @Body() dto: UpdateVotingCandidateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.votingService.updateCandidate(candidateId, dto);
    await this.recordVotingAudit(
      'voting_candidate_updated',
      actor,
      ip,
      candidateId,
      { userAgent, payload: dto, after: result },
    );
    return result;
  }

  @Get('campaigns/:campaignId/results')
  @ApiOperation({ summary: 'Resumo de votos da campanha' })
  @ApiResponse({ status: 200, type: VotingCampaignResultsResponseDto })
  async getCampaignResults(
    @Param('campaignId', new ParseUUIDPipe({ version: '4' }))
    campaignId: string,
  ): Promise<VotingCampaignResultsResponseDto> {
    return await this.votingService.getCampaignResults(campaignId);
  }

  private async recordVotingAudit(
    action: string,
    actor: AuthenticatedUser,
    ip: string | undefined,
    resourceId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLogService.recordSafe({
      userId: actor.id,
      action,
      resource: 'vote_campaigns',
      resourceId,
      ip,
      metadata: {
        actorEmail: actor.email,
        ...metadata,
      },
    });
  }
}
