import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  constructor(private readonly votingService: VotingService) {}

  @Post('campaigns')
  @RequirePermission('vote_campaigns', 'create')
  @ApiOperation({ summary: 'Cria campanha de votacao' })
  @ApiBody({ type: CreateVotingCampaignDto })
  @ApiResponse({ status: 201, type: AdminVotingCampaignResponseDto })
  async createCampaign(@Body() dto: CreateVotingCampaignDto) {
    return await this.votingService.createCampaign(dto);
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
  ) {
    return await this.votingService.updateCampaign(campaignId, dto);
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
  ) {
    return await this.votingService.createCategory(campaignId, dto);
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
  ) {
    return await this.votingService.updateCategory(categoryId, dto);
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
  ) {
    return await this.votingService.createCandidate(campaignId, dto);
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
  ) {
    return await this.votingService.updateCandidate(candidateId, dto);
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
}
