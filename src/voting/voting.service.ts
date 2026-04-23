import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';
import {
  VotingCampaign,
  VotingCampaignStatus,
} from '../database/entities/voting/voting-campaign.entity';
import { VotingCandidate } from '../database/entities/voting/voting-candidate.entity';
import { VotingCategory } from '../database/entities/voting/voting-category.entity';
import {
  VotingVote,
  VotingVoteStatus,
} from '../database/entities/voting/voting-vote.entity';
import { VotingVoter } from '../database/entities/voting/voting-voter.entity';
import {
  AdminVotingCampaignListItemDto,
  AdminVotingCampaignResponseDto,
} from './dto/admin-voting-campaign-response.dto';
import { AdminVotingCandidateResponseDto } from './dto/admin-voting-candidate-response.dto';
import { AdminVotingCategoryResponseDto } from './dto/admin-voting-category-response.dto';
import { CreateVotingCampaignDto } from './dto/create-voting-campaign.dto';
import { CreateVotingCandidateDto } from './dto/create-voting-candidate.dto';
import { CreateVotingCategoryDto } from './dto/create-voting-category.dto';
import { CreateVotingVoteDto } from './dto/create-voting-vote.dto';
import { ListPublicVotingCandidatesQueryDto } from './dto/list-public-voting-candidates-query.dto';
import {
  PublicVotingCampaignCategoryDto,
  PublicVotingCampaignResponseDto,
} from './dto/public-voting-campaign-response.dto';
import { PublicVotingCandidateItemDto } from './dto/public-voting-candidate-item.dto';
import { UpdateVotingCampaignDto } from './dto/update-voting-campaign.dto';
import { UpdateVotingCandidateDto } from './dto/update-voting-candidate.dto';
import { UpdateVotingCategoryDto } from './dto/update-voting-category.dto';
import {
  VotingCampaignResultItemDto,
  VotingCampaignResultsResponseDto,
} from './dto/voting-campaign-results-response.dto';
import { VotingVoteRegisteredResponseDto } from './dto/voting-vote-registered-response.dto';

type CategoryCountRaw = {
  campaign_id: string;
  total: string;
};

type VoteCountRaw = {
  campaign_id: string;
  total: string;
};

type PublicCategoryRaw = {
  id: string;
  slug: string;
  name: string;
  display_order: number;
  candidate_count: string;
};

type PublicCandidateRaw = {
  id: string;
  campaign_id: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  name: string;
  story_text: string | null;
  photo_url: string;
  display_order: number;
};

type CampaignResultRaw = {
  candidate_id: string;
  candidate_name: string;
  candidate_photo_url: string;
  candidate_story_text: string | null;
  category_id: string;
  category_name: string;
  vote_count: string;
};

@Injectable()
export class VotingService {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private static readonly SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  constructor(
    @InjectRepository(VotingCampaign)
    private readonly campaignRepo: Repository<VotingCampaign>,
    @InjectRepository(VotingCategory)
    private readonly categoryRepo: Repository<VotingCategory>,
    @InjectRepository(VotingCandidate)
    private readonly candidateRepo: Repository<VotingCandidate>,
    @InjectRepository(VotingVoter)
    private readonly voterRepo: Repository<VotingVoter>,
    @InjectRepository(VotingVote)
    private readonly voteRepo: Repository<VotingVote>,
    private readonly config: ConfigService,
  ) {}

  async createCampaign(
    dto: CreateVotingCampaignDto,
  ): Promise<AdminVotingCampaignResponseDto> {
    const slug = this.parseSlug(dto.slug, 'slug');
    const name = this.parseRequiredText(dto.name, 'name');
    const description = this.parseOptionalText(dto.description);
    const startsAt = this.parseDate(dto.starts_at, 'starts_at');
    const endsAt = this.parseDate(dto.ends_at, 'ends_at');
    this.assertDateRange(startsAt, endsAt);

    const status = this.parseCampaignStatus(dto.status);
    const active = this.parseOptionalBoolean(dto.active, 'active') ?? true;

    try {
      const saved = await this.campaignRepo.save(
        this.campaignRepo.create({
          slug,
          name,
          description,
          starts_at: startsAt,
          ends_at: endsAt,
          status,
          active,
        }),
      );
      return this.mapCampaign(saved);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(`Ja existe campanha com slug="${slug}".`);
      }
      throw error;
    }
  }

  async listCampaigns(): Promise<AdminVotingCampaignListItemDto[]> {
    const campaigns = await this.campaignRepo.find({
      order: { created_at: 'DESC' },
    });

    if (!campaigns.length) {
      return [];
    }

    const campaignIds = campaigns.map((campaign) => campaign.id);

    const categoryCounts = await this.categoryRepo
      .createQueryBuilder('category')
      .select([
        'category.campaign_id AS campaign_id',
        'COUNT(category.id)::text AS total',
      ])
      .where('category.campaign_id IN (:...campaignIds)', { campaignIds })
      .groupBy('category.campaign_id')
      .getRawMany<CategoryCountRaw>();

    const candidateCounts = await this.candidateRepo
      .createQueryBuilder('candidate')
      .select([
        'candidate.campaign_id AS campaign_id',
        'COUNT(candidate.id)::text AS total',
      ])
      .where('candidate.campaign_id IN (:...campaignIds)', { campaignIds })
      .groupBy('candidate.campaign_id')
      .getRawMany<CategoryCountRaw>();

    const voteCounts = await this.voteRepo
      .createQueryBuilder('vote')
      .select([
        'vote.campaign_id AS campaign_id',
        'COUNT(vote.id)::text AS total',
      ])
      .where('vote.campaign_id IN (:...campaignIds)', { campaignIds })
      .andWhere('vote.status = :status', { status: VotingVoteStatus.VALID })
      .groupBy('vote.campaign_id')
      .getRawMany<VoteCountRaw>();

    const categoriesByCampaign = new Map(
      categoryCounts.map((row) => [row.campaign_id, Number(row.total)]),
    );
    const candidatesByCampaign = new Map(
      candidateCounts.map((row) => [row.campaign_id, Number(row.total)]),
    );
    const votesByCampaign = new Map(
      voteCounts.map((row) => [row.campaign_id, Number(row.total)]),
    );

    return campaigns.map((campaign) => ({
      ...this.mapCampaign(campaign),
      category_count: categoriesByCampaign.get(campaign.id) ?? 0,
      candidate_count: candidatesByCampaign.get(campaign.id) ?? 0,
      vote_count: votesByCampaign.get(campaign.id) ?? 0,
    }));
  }

  async updateCampaign(
    campaignId: string,
    dto: UpdateVotingCampaignDto,
  ): Promise<AdminVotingCampaignResponseDto> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException(`Campanha nao encontrada para id=${campaignId}.`);
    }

    if (dto.slug !== undefined) {
      campaign.slug = this.parseSlug(dto.slug, 'slug');
    }

    if (dto.name !== undefined) {
      campaign.name = this.parseRequiredText(dto.name, 'name');
    }

    if (dto.description !== undefined) {
      campaign.description = this.parseOptionalText(dto.description);
    }

    if (dto.starts_at !== undefined) {
      campaign.starts_at = this.parseDate(dto.starts_at, 'starts_at');
    }

    if (dto.ends_at !== undefined) {
      campaign.ends_at = this.parseDate(dto.ends_at, 'ends_at');
    }

    this.assertDateRange(campaign.starts_at, campaign.ends_at);

    if (dto.status !== undefined) {
      campaign.status = this.parseCampaignStatus(dto.status);
    }

    if (dto.active !== undefined) {
      campaign.active = this.parseOptionalBoolean(dto.active, 'active') ?? true;
    }

    try {
      const saved = await this.campaignRepo.save(campaign);
      return this.mapCampaign(saved);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(`Ja existe campanha com slug="${campaign.slug}".`);
      }
      throw error;
    }
  }

  async createCategory(
    campaignId: string,
    dto: CreateVotingCategoryDto,
  ): Promise<AdminVotingCategoryResponseDto> {
    const campaign = await this.mustFindCampaignById(campaignId);

    const slug = this.parseSlug(dto.slug, 'slug');
    const name = this.parseRequiredText(dto.name, 'name');
    const displayOrder = this.parseOptionalInteger(dto.display_order, 'display_order') ?? 0;
    const active = this.parseOptionalBoolean(dto.active, 'active') ?? true;

    try {
      const saved = await this.categoryRepo.save(
        this.categoryRepo.create({
          campaign,
          slug,
          name,
          display_order: displayOrder,
          active,
        }),
      );
      return this.mapCategory(saved, campaign.id);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          `Ja existe categoria slug="${slug}" nesta campanha.`,
        );
      }
      throw error;
    }
  }

  async listCategories(campaignId: string): Promise<AdminVotingCategoryResponseDto[]> {
    await this.mustFindCampaignById(campaignId);

    const categories = await this.categoryRepo.find({
      where: { campaign: { id: campaignId } },
      order: { display_order: 'ASC', created_at: 'ASC' },
    });

    return categories.map((category) => this.mapCategory(category, campaignId));
  }

  async updateCategory(
    categoryId: string,
    dto: UpdateVotingCategoryDto,
  ): Promise<AdminVotingCategoryResponseDto> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
      relations: ['campaign'],
    });

    if (!category) {
      throw new NotFoundException(`Categoria nao encontrada para id=${categoryId}.`);
    }

    if (dto.slug !== undefined) {
      category.slug = this.parseSlug(dto.slug, 'slug');
    }

    if (dto.name !== undefined) {
      category.name = this.parseRequiredText(dto.name, 'name');
    }

    if (dto.display_order !== undefined) {
      category.display_order =
        this.parseOptionalInteger(dto.display_order, 'display_order') ?? 0;
    }

    if (dto.active !== undefined) {
      category.active = this.parseOptionalBoolean(dto.active, 'active') ?? true;
    }

    try {
      const saved = await this.categoryRepo.save(category);
      return this.mapCategory(saved, category.campaign.id);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          `Ja existe categoria slug="${category.slug}" nesta campanha.`,
        );
      }
      throw error;
    }
  }

  async createCandidate(
    campaignId: string,
    dto: CreateVotingCandidateDto,
  ): Promise<AdminVotingCandidateResponseDto> {
    const campaign = await this.mustFindCampaignById(campaignId);
    this.ensureUuid(dto.category_id, 'category_id');

    const category = await this.categoryRepo.findOne({
      where: { id: dto.category_id },
      relations: ['campaign'],
    });

    if (!category) {
      throw new NotFoundException(`Categoria nao encontrada para id=${dto.category_id}.`);
    }

    if (category.campaign.id !== campaign.id) {
      throw new BadRequestException(
        'A categoria informada nao pertence a campanha selecionada.',
      );
    }

    const name = this.parseRequiredText(dto.name, 'name');
    const storyText = this.parseOptionalText(dto.story_text);
    const photoUrl = this.parseRequiredText(dto.photo_url, 'photo_url');
    const displayOrder = this.parseOptionalInteger(dto.display_order, 'display_order') ?? 0;
    const active = this.parseOptionalBoolean(dto.active, 'active') ?? true;

    const saved = await this.candidateRepo.save(
      this.candidateRepo.create({
        campaign,
        category,
        name,
        story_text: storyText,
        photo_url: photoUrl,
        display_order: displayOrder,
        active,
      }),
    );
    return this.mapCandidate(saved, campaign.id);
  }

  async listCandidates(campaignId: string): Promise<AdminVotingCandidateResponseDto[]> {
    await this.mustFindCampaignById(campaignId);

    const candidates = await this.candidateRepo.find({
      where: { campaign: { id: campaignId } },
      relations: ['category'],
      order: {
        display_order: 'ASC',
        created_at: 'ASC',
      },
    });

    return candidates.map((candidate) => this.mapCandidate(candidate, campaignId));
  }

  async updateCandidate(
    candidateId: string,
    dto: UpdateVotingCandidateDto,
  ): Promise<AdminVotingCandidateResponseDto> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ['campaign', 'category'],
    });

    if (!candidate) {
      throw new NotFoundException(`Candidato nao encontrado para id=${candidateId}.`);
    }

    if (dto.category_id !== undefined) {
      this.ensureUuid(dto.category_id, 'category_id');
      const category = await this.categoryRepo.findOne({
        where: { id: dto.category_id },
        relations: ['campaign'],
      });
      if (!category) {
        throw new NotFoundException(`Categoria nao encontrada para id=${dto.category_id}.`);
      }
      if (category.campaign.id !== candidate.campaign.id) {
        throw new BadRequestException(
          'A categoria informada nao pertence a campanha do candidato.',
        );
      }
      candidate.category = category;
    }

    if (dto.name !== undefined) {
      candidate.name = this.parseRequiredText(dto.name, 'name');
    }

    if (dto.story_text !== undefined) {
      candidate.story_text = this.parseOptionalText(dto.story_text);
    }

    if (dto.photo_url !== undefined) {
      candidate.photo_url = this.parseRequiredText(dto.photo_url, 'photo_url');
    }

    if (dto.display_order !== undefined) {
      candidate.display_order =
        this.parseOptionalInteger(dto.display_order, 'display_order') ?? 0;
    }

    if (dto.active !== undefined) {
      candidate.active = this.parseOptionalBoolean(dto.active, 'active') ?? true;
    }

    const saved = await this.candidateRepo.save(candidate);
    return this.mapCandidate(saved, candidate.campaign.id);
  }

  async getCampaignResults(campaignId: string): Promise<VotingCampaignResultsResponseDto> {
    await this.mustFindCampaignById(campaignId);

    const totalVotes = await this.voteRepo.count({
      where: {
        campaign: { id: campaignId },
        status: VotingVoteStatus.VALID,
      },
    });

    const rows = await this.candidateRepo
      .createQueryBuilder('candidate')
      .innerJoin('candidate.category', 'category')
      .leftJoin(
        VotingVote,
        'vote',
        'vote.candidate_id = candidate.id AND vote.status = :status',
        { status: VotingVoteStatus.VALID },
      )
      .select([
        'candidate.id AS candidate_id',
        'candidate.name AS candidate_name',
        'candidate.photo_url AS candidate_photo_url',
        'candidate.story_text AS candidate_story_text',
        'category.id AS category_id',
        'category.name AS category_name',
        'COUNT(vote.id)::text AS vote_count',
      ])
      .where('candidate.campaign_id = :campaignId', { campaignId })
      .groupBy('candidate.id')
      .addGroupBy('category.id')
      .orderBy('COUNT(vote.id)', 'DESC')
      .addOrderBy('candidate.display_order', 'ASC')
      .addOrderBy('candidate.name', 'ASC')
      .getRawMany<CampaignResultRaw>();

    const items: VotingCampaignResultItemDto[] = rows.map((row) => ({
      candidate_id: row.candidate_id,
      candidate_name: row.candidate_name,
      candidate_photo_url: row.candidate_photo_url,
      candidate_story_text: row.candidate_story_text,
      category_id: row.category_id,
      category_name: row.category_name,
      vote_count: Number(row.vote_count),
    }));

    return {
      campaign_id: campaignId,
      total_votes: totalVotes,
      items,
    };
  }

  async getPublicCampaign(slug: string): Promise<PublicVotingCampaignResponseDto> {
    const normalizedSlug = this.parseSlug(slug, 'slug');

    const campaign = await this.campaignRepo.findOne({
      where: {
        slug: normalizedSlug,
        active: true,
      },
    });

    if (!campaign || campaign.status !== VotingCampaignStatus.PUBLISHED) {
      throw new NotFoundException(
        `Campanha publica nao encontrada para slug="${normalizedSlug}".`,
      );
    }

    const categoryRows = await this.categoryRepo
      .createQueryBuilder('category')
      .leftJoin(
        VotingCandidate,
        'candidate',
        'candidate.category_id = category.id AND candidate.active = true',
      )
      .select([
        'category.id AS id',
        'category.slug AS slug',
        'category.name AS name',
        'category.display_order AS display_order',
        'COUNT(candidate.id)::text AS candidate_count',
      ])
      .where('category.campaign_id = :campaignId', { campaignId: campaign.id })
      .andWhere('category.active = true')
      .groupBy('category.id')
      .orderBy('category.display_order', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getRawMany<PublicCategoryRaw>();

    const categories: PublicVotingCampaignCategoryDto[] = categoryRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      display_order: Number(row.display_order),
      candidate_count: Number(row.candidate_count),
    }));

    const totalCandidates = categories.reduce(
      (sum, category) => sum + category.candidate_count,
      0,
    );

    return {
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      description: campaign.description ?? null,
      status: campaign.status,
      starts_at: campaign.starts_at.toISOString(),
      ends_at: campaign.ends_at.toISOString(),
      total_candidates: totalCandidates,
      categories,
    };
  }

  async listPublicCandidates(
    slug: string,
    query: ListPublicVotingCandidatesQueryDto,
  ): Promise<PublicVotingCandidateItemDto[]> {
    const normalizedSlug = this.parseSlug(slug, 'slug');

    const campaign = await this.campaignRepo.findOne({
      where: {
        slug: normalizedSlug,
        active: true,
      },
    });

    if (!campaign || campaign.status !== VotingCampaignStatus.PUBLISHED) {
      throw new NotFoundException(
        `Campanha publica nao encontrada para slug="${normalizedSlug}".`,
      );
    }

    const categorySlug =
      query.category_slug !== undefined
        ? this.parseSlug(query.category_slug, 'category_slug')
        : undefined;

    const search = this.parseOptionalText(query.search)?.toLowerCase();

    const qb = this.candidateRepo
      .createQueryBuilder('candidate')
      .innerJoin('candidate.category', 'category')
      .select([
        'candidate.id AS id',
        'candidate.campaign_id AS campaign_id',
        'candidate.category_id AS category_id',
        'category.slug AS category_slug',
        'category.name AS category_name',
        'candidate.name AS name',
        'candidate.story_text AS story_text',
        'candidate.photo_url AS photo_url',
        'candidate.display_order AS display_order',
      ])
      .where('candidate.campaign_id = :campaignId', { campaignId: campaign.id })
      .andWhere('candidate.active = true')
      .andWhere('category.active = true');

    if (categorySlug) {
      qb.andWhere('LOWER(category.slug) = :categorySlug', { categorySlug });
    }

    if (search) {
      qb.andWhere('LOWER(candidate.name) LIKE :search', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('category.display_order', 'ASC')
      .addOrderBy('candidate.display_order', 'ASC')
      .addOrderBy('candidate.name', 'ASC');

    const rows = await qb.getRawMany<PublicCandidateRaw>();

    return rows.map((row) => ({
      id: row.id,
      campaign_id: row.campaign_id,
      category_id: row.category_id,
      category_slug: row.category_slug,
      category_name: row.category_name,
      name: row.name,
      story_text: row.story_text,
      photo_url: row.photo_url,
      display_order: Number(row.display_order),
    }));
  }

  async registerVote(
    dto: CreateVotingVoteDto,
    context: { ip?: string; user_agent?: string },
  ): Promise<VotingVoteRegisteredResponseDto> {
    const campaignSlug = this.parseSlug(dto.campaign_slug, 'campaign_slug');
    this.ensureUuid(dto.candidate_id, 'candidate_id');

    const voterName = this.parseRequiredText(dto.name, 'name');
    const voterEmail = this.parseRequiredText(dto.email, 'email');
    const voterEmailNormalized = this.normalizeEmail(voterEmail);
    const voterPhone = this.parseRequiredText(dto.phone, 'phone');
    const voterPhoneNormalized = this.normalizePhone(voterPhone);

    const metadata = this.parseMetadata(dto.metadata);

    const campaign = await this.campaignRepo.findOne({
      where: {
        slug: campaignSlug,
        active: true,
      },
    });

    if (!campaign || campaign.status !== VotingCampaignStatus.PUBLISHED) {
      throw new NotFoundException(
        `Campanha publica nao encontrada para slug="${campaignSlug}".`,
      );
    }

    const now = new Date();
    if (now < campaign.starts_at || now > campaign.ends_at) {
      throw new BadRequestException('A campanha nao esta no periodo de votacao.');
    }

    const candidate = await this.candidateRepo.findOne({
      where: { id: dto.candidate_id },
      relations: ['campaign', 'category'],
    });

    if (!candidate) {
      throw new NotFoundException(`Candidato nao encontrado para id=${dto.candidate_id}.`);
    }

    if (candidate.campaign.id !== campaign.id) {
      throw new BadRequestException('O candidato informado nao pertence a campanha.');
    }

    if (!candidate.active || !candidate.category.active) {
      throw new BadRequestException('O candidato informado nao esta apto para votacao.');
    }

    const voter = await this.findOrCreateVoter({
      name: voterName,
      email: voterEmail,
      emailNormalized: voterEmailNormalized,
      phone: voterPhone,
      phoneNormalized: voterPhoneNormalized,
    });

    const ipHash = this.hashIp(context.ip);
    const userAgent = this.parseOptionalText(context.user_agent);

    const vote = await this.voteRepo.save(
      this.voteRepo.create({
        campaign,
        candidate,
        voter,
        status: VotingVoteStatus.VALID,
        ip_hash: ipHash,
        user_agent: userAgent,
        metadata: {
          ...(metadata ?? {}),
          category_id: candidate.category.id,
          category_slug: candidate.category.slug,
        },
      }),
    );

    return {
      vote_id: vote.id,
      campaign_id: campaign.id,
      candidate_id: candidate.id,
      voter_id: voter.id,
      created_at: vote.created_at.toISOString(),
    };
  }

  private async findOrCreateVoter(params: {
    name: string;
    email: string;
    emailNormalized: string;
    phone: string;
    phoneNormalized: string;
  }): Promise<VotingVoter> {
    const byEmail = await this.voterRepo.findOne({
      where: { email_normalized: params.emailNormalized },
    });

    const byPhone = await this.voterRepo.findOne({
      where: { phone_normalized: params.phoneNormalized },
    });

    if (byEmail && byPhone && byEmail.id !== byPhone.id) {
      throw new ConflictException(
        'Email e telefone informados estao vinculados a votantes diferentes.',
      );
    }

    const voter = byEmail ?? byPhone;

    if (!voter) {
      try {
        return await this.voterRepo.save(
          this.voterRepo.create({
            name: params.name,
            email: params.email,
            email_normalized: params.emailNormalized,
            phone: params.phone,
            phone_normalized: params.phoneNormalized,
          }),
        );
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          throw new ConflictException(
            'Nao foi possivel registrar votante por conflito de email ou telefone.',
          );
        }
        throw error;
      }
    }

    voter.name = params.name;
    voter.email = params.email;
    voter.email_normalized = params.emailNormalized;
    voter.phone = params.phone;
    voter.phone_normalized = params.phoneNormalized;

    try {
      return await this.voterRepo.save(voter);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Nao foi possivel atualizar votante por conflito de email ou telefone.',
        );
      }
      throw error;
    }
  }

  private async mustFindCampaignById(campaignId: string): Promise<VotingCampaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException(`Campanha nao encontrada para id=${campaignId}.`);
    }
    return campaign;
  }

  private parseRequiredText(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} deve ser string.`);
    }
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} e obrigatorio.`);
    }
    return normalized;
  }

  private parseOptionalText(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
      throw new BadRequestException('Valor invalido: esperado texto.');
    }
    const normalized = value.trim();
    return normalized || undefined;
  }

  private parseSlug(value: unknown, fieldName: string): string {
    const text = this.parseRequiredText(value, fieldName).toLowerCase();
    if (!VotingService.SLUG_REGEX.test(text)) {
      throw new BadRequestException(
        `${fieldName} invalido. Use somente letras minusculas, numeros e hifen.`,
      );
    }
    return text;
  }

  private parseDate(value: unknown, fieldName: string): Date {
    const text = this.parseRequiredText(value, fieldName);
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} deve ser uma data valida em ISO 8601.`);
    }
    return parsed;
  }

  private assertDateRange(startsAt: Date, endsAt: Date): void {
    if (startsAt > endsAt) {
      throw new BadRequestException('starts_at deve ser menor ou igual a ends_at.');
    }
  }

  private parseCampaignStatus(value: unknown): VotingCampaignStatus {
    if (value === undefined || value === null) {
      return VotingCampaignStatus.DRAFT;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('status deve ser string.');
    }

    const normalized = value.trim().toUpperCase();
    if (!Object.values(VotingCampaignStatus).includes(normalized as VotingCampaignStatus)) {
      throw new BadRequestException(
        `status invalido. Use ${Object.values(VotingCampaignStatus).join(', ')}.`,
      );
    }

    return normalized as VotingCampaignStatus;
  }

  private parseOptionalBoolean(
    value: unknown,
    fieldName: string,
  ): boolean | undefined {
    if (value === undefined || value === null) return undefined;

    if (typeof value === 'boolean') return value;

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }

    throw new BadRequestException(
      `${fieldName} invalido. Use boolean true/false (ou 1/0).`,
    );
  }

  private parseOptionalInteger(
    value: unknown,
    fieldName: string,
  ): number | undefined {
    if (value === undefined || value === null) return undefined;

    const num =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;

    if (!Number.isInteger(num)) {
      throw new BadRequestException(`${fieldName} deve ser inteiro.`);
    }

    return num;
  }

  private normalizeEmail(value: string): string {
    const email = value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('email invalido.');
    }
    return email;
  }

  private normalizePhone(value: string): string {
    const digits = value.replace(/\D+/g, '');
    if (digits.length < 8 || digits.length > 15) {
      throw new BadRequestException('phone invalido. Informe um telefone valido.');
    }
    return `+${digits}`;
  }

  private parseMetadata(
    value: unknown,
  ): Record<string, unknown> | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('metadata deve ser um objeto JSON.');
    }
    return value as Record<string, unknown>;
  }

  private ensureUuid(value: unknown, fieldName: string): void {
    if (typeof value !== 'string' || !VotingService.UUID_REGEX.test(value)) {
      throw new BadRequestException(`${fieldName} deve ser um UUID valido.`);
    }
  }

  private hashIp(ip?: string): string | undefined {
    const normalized = ip?.trim();
    if (!normalized) return undefined;

    const salt = this.config.get<string>('VOTING_IP_HASH_SALT', 'voting-default-salt');
    return createHash('sha256').update(`${salt}:${normalized}`, 'utf8').digest('hex');
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = error.driverError as { code?: string } | undefined;
    return driverError?.code === '23505';
  }

  private mapCampaign(campaign: VotingCampaign): AdminVotingCampaignResponseDto {
    return {
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      description: campaign.description ?? null,
      starts_at: campaign.starts_at.toISOString(),
      ends_at: campaign.ends_at.toISOString(),
      status: campaign.status,
      active: campaign.active,
      created_at: campaign.created_at.toISOString(),
      updated_at: campaign.updated_at.toISOString(),
    };
  }

  private mapCategory(
    category: VotingCategory,
    campaignId: string,
  ): AdminVotingCategoryResponseDto {
    return {
      id: category.id,
      campaign_id: campaignId,
      slug: category.slug,
      name: category.name,
      display_order: category.display_order,
      active: category.active,
      created_at: category.created_at.toISOString(),
      updated_at: category.updated_at.toISOString(),
    };
  }

  private mapCandidate(
    candidate: VotingCandidate,
    campaignId: string,
  ): AdminVotingCandidateResponseDto {
    return {
      id: candidate.id,
      campaign_id: campaignId,
      category_id: candidate.category.id,
      category_slug: candidate.category.slug,
      category_name: candidate.category.name,
      name: candidate.name,
      story_text: candidate.story_text ?? null,
      photo_url: candidate.photo_url,
      active: candidate.active,
      display_order: candidate.display_order,
      created_at: candidate.created_at.toISOString(),
      updated_at: candidate.updated_at.toISOString(),
    };
  }
}
