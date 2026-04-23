import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CreateVotingVoteDto } from './dto/create-voting-vote.dto';
import { ListPublicVotingCandidatesQueryDto } from './dto/list-public-voting-candidates-query.dto';
import { PublicVotingCandidateItemDto } from './dto/public-voting-candidate-item.dto';
import { PublicVotingCampaignResponseDto } from './dto/public-voting-campaign-response.dto';
import { VotingVoteRegisteredResponseDto } from './dto/voting-vote-registered-response.dto';
import { VotingService } from './voting.service';

@ApiTags('Voting Public')
@Controller('v1/voting/public')
export class VotingPublicController {
  constructor(private readonly votingService: VotingService) {}

  @Get('campaigns/:slug')
  @ApiOperation({
    summary: 'Detalhes publicos da campanha de votacao',
  })
  @ApiResponse({
    status: 200,
    type: PublicVotingCampaignResponseDto,
  })
  async getCampaign(@Param('slug') slug: string) {
    return await this.votingService.getPublicCampaign(slug);
  }

  @Get('campaigns/:slug/candidates')
  @ApiOperation({
    summary: 'Lista candidatos publicos da campanha',
  })
  @ApiQuery({ name: 'category_slug', required: false, example: 'financeira' })
  @ApiQuery({ name: 'search', required: false, example: 'fernanda' })
  @ApiResponse({
    status: 200,
    type: PublicVotingCandidateItemDto,
    isArray: true,
  })
  async listCandidates(
    @Param('slug') slug: string,
    @Query() query: ListPublicVotingCandidatesQueryDto,
  ) {
    return await this.votingService.listPublicCandidates(slug, query);
  }

  @Post('votes')
  @ApiOperation({
    summary: 'Registra voto publico',
  })
  @ApiBody({ type: CreateVotingVoteDto })
  @ApiResponse({
    status: 201,
    type: VotingVoteRegisteredResponseDto,
  })
  async registerVote(
    @Body() dto: CreateVotingVoteDto,
    @Req() req: Request,
  ): Promise<VotingVoteRegisteredResponseDto> {
    const ipHeader = req.headers['x-forwarded-for'];
    const forwarded =
      typeof ipHeader === 'string'
        ? ipHeader.split(',')[0]?.trim()
        : Array.isArray(ipHeader)
          ? ipHeader[0]
          : undefined;

    return await this.votingService.registerVote(dto, {
      ip: forwarded || req.ip,
      user_agent: req.headers['user-agent'],
    });
  }
}
