import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Capture } from '../database/entities/capture/capture.entity';
import { FormAnswer } from '../database/entities/form/form-answer.entity';
import { FormResponse } from '../database/entities/form/form-response.entity';
import { Question } from '../database/entities/form/question.entity';
import { QuestionOption } from '../database/entities/form/question-option.entity';
import { HotmartProduct } from '../database/entities/hotmart/hotmart-product.entity';
import { HotmartSale } from '../database/entities/hotmart/hotmart-sale.entity';
import { LaunchDashboardConfig } from '../database/entities/launch-dashboard/launch-dashboard-config.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { MetaAdPerformance } from '../database/entities/meta-ads/meta-ad-performance.entity';
import { MarketingConnectionAccount } from '../database/entities/marketing-sync/marketing-connection-account.entity';
import { LeadscoreResult } from '../database/entities/leadscore/leadscore-result.entity';
import { LeadscoreTier } from '../database/entities/leadscore/leadscore-tier.entity';
import { Temperature } from '../database/entities/marketing/temperature.entity';
import { UpsertLaunchDashboardConfigDto } from './dto/upsert-launch-dashboard-config.dto';
import { LaunchDashboardQueryDto } from './dto/launch-dashboard-query.dto';
import { CompareLaunchesDto } from './dto/compare-launches.dto';

type MediaAgg = {
  spend: number;
  impressions: number;
  clicks: number;
  inlineLinkClicks: number;
  landingPageViews: number;
  initiateCheckouts: number;
};

type FunnelAdRow = MediaAgg & {
  externalAdId: string;
  adName: string | null;
  externalCampaignId: string | null;
  campaignName: string | null;
  externalAdsetId: string | null;
  adsetName: string | null;
  externalAccountId: string;
  accountName: string | null;
};

@Injectable()
export class LaunchDashboardService {
  constructor(
    @InjectRepository(MetaAdPerformance)
    private readonly perfRepo: Repository<MetaAdPerformance>,
    @InjectRepository(Capture)
    private readonly captureRepo: Repository<Capture>,
    @InjectRepository(HotmartSale)
    private readonly saleRepo: Repository<HotmartSale>,
    @InjectRepository(Launch)
    private readonly launchRepo: Repository<Launch>,
    @InjectRepository(LaunchDashboardConfig)
    private readonly configRepo: Repository<LaunchDashboardConfig>,
    @InjectRepository(FormResponse)
    private readonly formResponseRepo: Repository<FormResponse>,
    @InjectRepository(FormAnswer)
    private readonly formAnswerRepo: Repository<FormAnswer>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(QuestionOption)
    private readonly questionOptionRepo: Repository<QuestionOption>,
    @InjectRepository(LeadscoreResult)
    private readonly leadscoreResultRepo: Repository<LeadscoreResult>,
    @InjectRepository(MarketingConnectionAccount)
    private readonly connectionAccountRepo: Repository<MarketingConnectionAccount>,
  ) {}

  // ─── Launches ─────────────────────────────────────────────────────────────

  async getLaunches() {
    return this.launchRepo.find({ order: { name: 'ASC' } });
  }

  // ─── Config ───────────────────────────────────────────────────────────────

  async getConfig(launchId: string): Promise<LaunchDashboardConfig | null> {
    return this.configRepo.findOne({ where: { launch_id: launchId } });
  }

  async upsertConfig(
    launchId: string,
    dto: UpsertLaunchDashboardConfigDto,
  ): Promise<LaunchDashboardConfig> {
    let config = await this.configRepo.findOne({
      where: { launch_id: launchId },
    });

    if (!config) {
      config = this.configRepo.create({ launch_id: launchId });
    }

    config.target_spend = dto.targetSpend ?? config.target_spend;
    config.target_leads = dto.targetLeads ?? config.target_leads;
    config.target_cpl = dto.targetCpl ?? config.target_cpl;
    config.target_connect_rate =
      dto.targetConnectRate ?? config.target_connect_rate;
    config.target_page_conversion =
      dto.targetPageConversion ?? config.target_page_conversion;
    config.target_cpc = dto.targetCpc ?? config.target_cpc;
    config.target_cpm = dto.targetCpm ?? config.target_cpm;
    config.target_ctr = dto.targetCtr ?? config.target_ctr;
    config.target_survey_response_rate =
      dto.targetSurveyResponseRate ?? config.target_survey_response_rate;
    config.target_consciousness_rate =
      dto.targetConsciousnessRate ?? config.target_consciousness_rate;
    config.target_knows_expert_rate =
      dto.targetKnowsExpertRate ?? config.target_knows_expert_rate;
    config.target_knows_alliance_rate =
      dto.targetKnowsAllianceRate ?? config.target_knows_alliance_rate;

    // Usa !== undefined em vez de ?? para permitir que null limpe o valor existente.
    // undefined = "campo não enviado, mantém o existente"
    // null = "campo enviado como vazio, limpa no banco"
    if (dto.questionKeyConsciousness !== undefined)
      config.question_key_consciousness = dto.questionKeyConsciousness;
    if (dto.positiveOptionKeyConsciousness !== undefined)
      config.positive_option_key_consciousness =
        dto.positiveOptionKeyConsciousness;
    if (dto.questionKeyKnowsExpert !== undefined)
      config.question_key_knows_expert = dto.questionKeyKnowsExpert;
    if (dto.positiveOptionKeyKnowsExpert !== undefined)
      config.positive_option_key_knows_expert =
        dto.positiveOptionKeyKnowsExpert;
    if (dto.questionKeyKnowsAlliance !== undefined)
      config.question_key_knows_alliance = dto.questionKeyKnowsAlliance;
    if (dto.positiveOptionKeyKnowsAlliance !== undefined)
      config.positive_option_key_knows_alliance =
        dto.positiveOptionKeyKnowsAlliance;

    if (dto.notificationMetrics !== undefined) {
      config.notification_metrics =
        dto.notificationMetrics && dto.notificationMetrics.length > 0
          ? dto.notificationMetrics.join(',')
          : null;
    }
    if (dto.notificationDateFrom !== undefined)
      config.notification_date_from = dto.notificationDateFrom;
    if (dto.notificationDateTo !== undefined)
      config.notification_date_to = dto.notificationDateTo;

    return this.configRepo.save(config);
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  async getNotifications() {
    const configs = await this.configRepo
      .createQueryBuilder('c')
      .innerJoin(Launch, 'l', 'l.id = c.launch_id')
      .select('c.launch_id', 'launchId')
      .addSelect('l.name', 'launchName')
      .addSelect('c.notification_metrics', 'metrics')
      .addSelect('c.notification_date_from', 'dateFrom')
      .addSelect('c.notification_date_to', 'dateTo')
      .addSelect('c.target_cpl', 'targetCpl')
      .addSelect('c.target_spend', 'targetSpend')
      .addSelect('c.target_leads', 'targetLeads')
      .addSelect('c.target_ctr', 'targetCtr')
      .addSelect('c.target_cpc', 'targetCpc')
      .addSelect('c.target_connect_rate', 'targetConnectRate')
      .addSelect('c.target_page_conversion', 'targetPageConversion')
      .where('c.notification_metrics IS NOT NULL')
      .andWhere('c.notification_date_from IS NOT NULL')
      .andWhere('c.notification_date_to IS NOT NULL')
      .getRawMany<{
        launchId: string;
        launchName: string;
        metrics: string;
        dateFrom: unknown;
        dateTo: unknown;
        targetCpl: string | null;
        targetSpend: string | null;
        targetLeads: string | null;
        targetCtr: string | null;
        targetCpc: string | null;
        targetConnectRate: string | null;
        targetPageConversion: string | null;
      }>();

    const toDateStr = (v: unknown): string => {
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v);
    };

    const results = await Promise.all(
      configs.map(async (cfg) => {
        const query = {
          launchId: cfg.launchId,
          dateFrom: toDateStr(cfg.dateFrom),
          dateTo: toDateStr(cfg.dateTo),
        } as import('./dto/launch-dashboard-query.dto').LaunchDashboardQueryDto;

        const [media, leadsCount] = await Promise.all([
          this.queryMediaAggregated(query),
          this.queryLeadsCount(query),
        ]);

        const summary = this.buildSummaryMetrics(media, leadsCount, {
          sales: 0,
          revenue: 0,
        });

        const n = (v: string | null) => (v != null ? Number(v) : null);
        const targetMap: Record<string, number | null> = {
          CPL: n(cfg.targetCpl),
          SPEND: n(cfg.targetSpend),
          LEADS: n(cfg.targetLeads),
          CTR: n(cfg.targetCtr),
          CPC: n(cfg.targetCpc),
          CONNECT_RATE: n(cfg.targetConnectRate),
          PAGE_CONVERSION: n(cfg.targetPageConversion),
        };

        const valueMap: Record<string, number | null> = {
          CPL: summary.cpl,
          SPEND: summary.spend,
          LEADS: summary.leads,
          CTR: summary.ctr,
          CPC: summary.cpc,
          CONNECT_RATE: summary.connectRate,
          PAGE_CONVERSION: summary.txPgvCheckout,
        };

        const metricKeys = cfg.metrics
          ? cfg.metrics.split(',').filter(Boolean)
          : [];

        return metricKeys.map((metric) => {
          const currentValue = valueMap[metric] ?? null;
          const targetValue = targetMap[metric] ?? null;
          const pctDiff =
            targetValue && currentValue !== null && targetValue !== 0
              ? ((currentValue - targetValue) / targetValue) * 100
              : null;

          return {
            launchId: cfg.launchId,
            launchName: cfg.launchName,
            metric,
            dateFrom: toDateStr(cfg.dateFrom),
            dateTo: toDateStr(cfg.dateTo),
            currentValue,
            targetValue,
            pctDiff,
            summary,
          };
        });
      }),
    );

    return results.flat();
  }

  // ─── Available questions ──────────────────────────────────────────────────

  async getAvailableQuestions(launchId?: string, seasonId?: string) {
    const qb = this.questionRepo
      .createQueryBuilder('q')
      .innerJoin('q.form', 'f')
      .leftJoin(QuestionOption, 'qo', 'qo.question_id = q.id')
      .select([
        'q.question_key AS "questionKey"',
        'q.question_text AS "questionText"',
        'q.input_type AS "inputType"',
        'qo.option_key AS "optionKey"',
        'qo.option_text AS "optionText"',
        'qo.display_order AS "displayOrder"',
      ])
      .orderBy('q.question_key', 'ASC')
      .addOrderBy('qo.display_order', 'ASC');

    if (launchId) {
      qb.andWhere('f.launch_id = :launchId', { launchId });
    }
    if (seasonId) {
      qb.andWhere('f.season_id = :seasonId', { seasonId });
    }

    const rows = await qb.getRawMany<{
      questionKey: string;
      questionText: string | null;
      inputType: string | null;
      optionKey: string | null;
      optionText: string | null;
    }>();

    const map = new Map<
      string,
      {
        questionKey: string;
        questionText: string | null;
        inputType: string | null;
        options: { optionKey: string; optionText: string | null }[];
      }
    >();
    const seenOptions = new Map<string, Set<string>>();

    for (const row of rows) {
      if (!map.has(row.questionKey)) {
        map.set(row.questionKey, {
          questionKey: row.questionKey,
          questionText: row.questionText,
          inputType: row.inputType,
          options: [],
        });
        seenOptions.set(row.questionKey, new Set());
      }
      if (
        row.optionKey &&
        !seenOptions.get(row.questionKey)!.has(row.optionKey)
      ) {
        seenOptions.get(row.questionKey)!.add(row.optionKey);
        map.get(row.questionKey)!.options.push({
          optionKey: row.optionKey,
          optionText: row.optionText,
        });
      }
    }

    return Array.from(map.values());
  }

  // ─── Lead profile (distribuição de respostas do quiz) ─────────────────────

  async getLeadProfile(query: LaunchDashboardQueryDto, questionKey?: string) {
    this.validateDates(query);

    // Reaproveita getAvailableQuestions pra ter a lista completa de opções por
    // pergunta (inclusive as com 0 respostas) — só perguntas de múltipla
    // escolha entram aqui, texto livre não tem uma "distribuição" bem definida.
    const availableQuestions = await this.getAvailableQuestions(
      query.launchId,
      query.seasonId,
    );
    const eligibleQuestions = availableQuestions.filter(
      (q) =>
        q.options.length > 0 && (!questionKey || q.questionKey === questionKey),
    );

    if (eligibleQuestions.length === 0) {
      return { questions: [] };
    }

    const keys = eligibleQuestions.map((q) => q.questionKey);

    const qb = this.formAnswerRepo
      .createQueryBuilder('fa')
      .innerJoin(FormResponse, 'fr', 'fr.id = fa.form_response_id')
      .innerJoin(Capture, 'c', 'c.id = fr.capture_id')
      .innerJoin(Question, 'q', 'q.id = fa.question_id')
      .innerJoin(QuestionOption, 'qo', 'qo.id = fa.option_id')
      .andWhere('q.question_key IN (:...keys)', { keys });

    this.applyFormResponseFilters(qb, query);

    const rows = await qb
      .select('q.question_key', 'questionKey')
      .addSelect('qo.option_key', 'optionKey')
      .addSelect('COUNT(DISTINCT fr.id)', 'count')
      .groupBy('q.question_key')
      .addGroupBy('qo.option_key')
      .getRawMany<{ questionKey: string; optionKey: string; count: string }>();

    const countMap = new Map<string, number>();
    for (const row of rows) {
      countMap.set(`${row.questionKey}::${row.optionKey}`, Number(row.count));
    }

    const questions = eligibleQuestions.map((q) => {
      const rawDistribution = q.options.map((opt) => ({
        optionKey: opt.optionKey,
        optionText: opt.optionText,
        count: countMap.get(`${q.questionKey}::${opt.optionKey}`) ?? 0,
      }));
      const total = rawDistribution.reduce((sum, d) => sum + d.count, 0);

      return {
        questionKey: q.questionKey,
        questionText: q.questionText,
        totalAnswered: total,
        distribution: rawDistribution.map((d) => ({
          ...d,
          percentage:
            total > 0 ? Number(((d.count / total) * 100).toFixed(2)) : 0,
        })),
      };
    });

    return { questions };
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  async getSummary(query: LaunchDashboardQueryDto) {
    this.validateDates(query);

    const [media, leadsCount, organicLeadsCount, salesData] = await Promise.all(
      [
        this.queryMediaAggregated(query),
        this.queryLeadsCount(query),
        this.queryOrganicLeadsCount(query),
        this.querySalesAggregated(query),
      ],
    );

    return {
      summary: this.buildSummaryMetrics(
        media,
        leadsCount,
        salesData,
        organicLeadsCount,
      ),
    };
  }

  // ─── Timeseries ───────────────────────────────────────────────────────────

  async getTimeseries(query: LaunchDashboardQueryDto) {
    this.validateDates(query);

    const [mediaRows, leadRows, saleRows] = await Promise.all([
      this.queryMediaTimeseries(query),
      this.queryLeadsTimeseries(query),
      this.querySalesTimeseries(query),
    ]);

    const mediaByDate = new Map(mediaRows.map((r) => [r.date, r]));
    const leadsByDate = new Map(leadRows.map((r) => [r.date, r.leads]));
    const salesByDate = new Map(saleRows.map((r) => [r.date, r.sales]));

    const dates = this.dateRange(query.dateFrom!, query.dateTo!);
    const timeseries = dates.map((date) => {
      const m = mediaByDate.get(date) ?? {
        spend: 0,
        impressions: 0,
        clicks: 0,
      };
      const leads = leadsByDate.get(date) ?? 0;
      const sales = salesByDate.get(date) ?? 0;

      return {
        date,
        spend: m.spend,
        impressions: m.impressions,
        clicks: m.clicks,
        leads,
        sales,
        ctr: this.div(m.clicks, m.impressions),
        cpl: this.div(m.spend, leads),
      };
    });

    return { timeseries };
  }

  // ─── Comparativo entre lançamentos ────────────────────────────────────────

  // Alinha cada lançamento pelo próprio dateFrom (dayIndex=0 = primeiro dia
  // do range informado para aquele lançamento) em vez de por data absoluta —
  // é o que permite comparar "semana 1 do ORO" com "semana 1 do LDI" mesmo
  // que tenham rodado em calendários diferentes. Não existe uma "data de
  // início" própria do Launch hoje, então quem define o que é "dia 0" de cada
  // lançamento é o dateFrom que o chamador passar.
  async compareLaunches(dto: CompareLaunchesDto) {
    if (!Array.isArray(dto.launches) || dto.launches.length < 2) {
      throw new BadRequestException(
        'Informe ao menos 2 lançamentos em "launches" para comparar.',
      );
    }

    const launches = await Promise.all(
      dto.launches.map(async (item) => {
        const query: LaunchDashboardQueryDto = {
          launchId: item.launchId,
          dateFrom: item.dateFrom,
          dateTo: item.dateTo,
        };
        const { timeseries } = await this.getTimeseries(query);

        let cumulativeLeads = 0;
        const series = timeseries.map((row, index) => {
          cumulativeLeads += row.leads;
          return {
            dayIndex: index,
            date: row.date,
            spend: row.spend,
            leads: row.leads,
            cumulativeLeads,
            cpl: row.cpl,
          };
        });

        return {
          launchId: item.launchId,
          label: item.label ?? item.launchId,
          dateFrom: item.dateFrom,
          dateTo: item.dateTo,
          series,
        };
      }),
    );

    return { launches };
  }

  // ─── Funnel table ─────────────────────────────────────────────────────────

  async getFunnelTable(query: LaunchDashboardQueryDto) {
    this.validateDates(query);

    const [mediaRows, leadsByAd, salesByAd] = await Promise.all([
      this.queryMediaByAd(query),
      this.queryLeadsByAd(query),
      this.querySalesByAd(query),
    ]);

    const rawItems = mediaRows.map((row) => {
      const leads = leadsByAd.get(row.externalAdId) ?? 0;
      const sale = salesByAd.get(row.externalAdId) ?? { sales: 0, revenue: 0 };

      return {
        ...row,
        externalAdIds: [row.externalAdId],
        leads,
        sales: sale.sales,
        revenue: sale.revenue,
      };
    });

    const merged =
      query.groupBy === 'adName'
        ? this.groupFunnelItemsByAdName(rawItems)
        : rawItems;

    const items = merged.map((row) => ({
      ...row,
      ctr: this.div(row.clicks, row.impressions),
      cpc: this.div(row.spend, row.clicks),
      cpm:
        row.impressions > 0
          ? Number(((row.spend * 1000) / row.impressions).toFixed(6))
          : null,
      connectRate: this.div(row.landingPageViews, row.inlineLinkClicks),
      txPgvCheckout: this.div(row.initiateCheckouts, row.landingPageViews),
      txCheckoutSale: this.div(row.sales, row.initiateCheckouts),
      cpl: this.div(row.spend, row.leads),
      cpa: this.div(row.spend, row.sales),
    }));

    items.sort((a, b) => b.spend - a.spend);

    return { items, total: items.length };
  }

  // Consolida linhas que compartilham o mesmo ad_name (nomenclatura do
  // criativo), já que o mesmo criativo pode gerar um external_ad_id novo a
  // cada campanha/reupload. Anúncios sem nome (adName null) NÃO são
  // agrupados entre si — cada um fica na própria chave, pra não misturar
  // criativos sem nomenclatura como se fossem o mesmo.
  private groupFunnelItemsByAdName<
    T extends FunnelAdRow & {
      externalAdIds: string[];
      leads: number;
      sales: number;
      revenue: number;
    },
  >(items: T[]): T[] {
    const groups = new Map<string, T>();

    for (const item of items) {
      const key = item.adName ?? `__id:${item.externalAdId}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, { ...item });
        continue;
      }

      existing.externalAdIds = [
        ...existing.externalAdIds,
        ...item.externalAdIds,
      ];
      existing.spend += item.spend;
      existing.impressions += item.impressions;
      existing.clicks += item.clicks;
      existing.inlineLinkClicks += item.inlineLinkClicks;
      existing.landingPageViews += item.landingPageViews;
      existing.initiateCheckouts += item.initiateCheckouts;
      existing.leads += item.leads;
      existing.sales += item.sales;
      existing.revenue += item.revenue;
    }

    return Array.from(groups.values());
  }

  // ─── Ranking de criativos ─────────────────────────────────────────────────

  async getTopCreatives(query: LaunchDashboardQueryDto, limit = 5) {
    this.validateDates(query);

    const currentTable = await this.getFunnelTable({
      ...query,
      groupBy: 'adName',
    });

    // CPL null (sem lead no período) não é rankeável — fica de fora do pódio.
    const ranked = currentTable.items
      .filter(
        (item): item is typeof item & { cpl: number } => item.cpl !== null,
      )
      .sort((a, b) => a.cpl - b.cpl)
      .slice(0, limit);

    if (ranked.length === 0) {
      return { items: [] };
    }

    // Período anterior de mesma duração, imediatamente antes do dateFrom —
    // usado só para calcular a tendência (CPL subiu/caiu) de cada criativo.
    const from = new Date(`${query.dateFrom}T00:00:00.000Z`);
    const to = new Date(`${query.dateTo}T00:00:00.000Z`);
    const durationDays =
      Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const previousDateTo = this.subtractDays(query.dateFrom!, 1);
    const previousDateFrom = this.subtractDays(
      previousDateTo,
      durationDays - 1,
    );

    const previousTable = await this.getFunnelTable({
      ...query,
      dateFrom: previousDateFrom,
      dateTo: previousDateTo,
      groupBy: 'adName',
    });
    const previousCplByName = new Map(
      previousTable.items
        .filter((item) => item.adName !== null)
        .map((item) => [item.adName as string, item.cpl]),
    );

    const items = ranked.map((item, index) => {
      const previousCpl = item.adName
        ? (previousCplByName.get(item.adName) ?? null)
        : null;

      let trend: 'up' | 'down' | 'flat' | 'new' = 'new';
      if (previousCpl !== null) {
        trend =
          item.cpl > previousCpl
            ? 'up' // CPL subiu = pior
            : item.cpl < previousCpl
              ? 'down' // CPL caiu = melhor
              : 'flat';
      }

      return {
        rank: index + 1,
        adName: item.adName,
        externalAdIds: item.externalAdIds,
        spend: item.spend,
        leads: item.leads,
        cpl: item.cpl,
        previousCpl,
        trend,
      };
    });

    return { items };
  }

  // ─── Awareness metrics ────────────────────────────────────────────────────

  async getAwarenessMetrics(query: LaunchDashboardQueryDto) {
    this.validateDates(query);

    const config = query.launchId ? await this.getConfig(query.launchId) : null;

    const [totalLeads, totalResponses] = await Promise.all([
      this.queryLeadsCount(query),
      this.queryFormResponseCount(query),
    ]);

    const surveyResponseRate =
      totalLeads > 0 ? Number((totalResponses / totalLeads).toFixed(6)) : null;

    const [consciousnessCount, knowsExpertCount, knowsAllianceCount] =
      await Promise.all([
        config?.question_key_consciousness
          ? this.queryConsciousnessKeywordCount(
              query,
              config.question_key_consciousness,
            )
          : Promise.resolve(null),
        config?.question_key_knows_expert
          ? this.queryPositiveAnswerCount(
              query,
              config.question_key_knows_expert,
              config.positive_option_key_knows_expert,
            )
          : Promise.resolve(null),
        config?.question_key_knows_alliance
          ? this.queryPositiveAnswerCount(
              query,
              config.question_key_knows_alliance,
              config.positive_option_key_knows_alliance,
            )
          : Promise.resolve(null),
      ]);

    const rate = (count: number | null) =>
      count !== null && totalResponses > 0
        ? Number((count / totalResponses).toFixed(6))
        : null;

    return {
      totalLeads,
      totalFormResponses: totalResponses,
      surveyResponseRate,
      consciousnessRate: rate(consciousnessCount),
      knowsExpertRate: rate(knowsExpertCount),
      knowsAllianceRate: rate(knowsAllianceCount),
      configured: {
        consciousness: !!config?.question_key_consciousness,
        knowsExpert: !!config?.question_key_knows_expert,
        knowsAlliance: !!config?.question_key_knows_alliance,
      },
    };
  }

  private async queryFormResponseCount(
    query: LaunchDashboardQueryDto,
  ): Promise<number> {
    const qb = this.formResponseRepo
      .createQueryBuilder('fr')
      .innerJoin(Capture, 'c', 'c.id = fr.capture_id')
      .andWhere('fr.capture_id IS NOT NULL');
    this.applyFormResponseFilters(qb, query);
    const row = await qb
      .select('COUNT(DISTINCT fr.id)', 'responses')
      .getRawOne<{ responses: string }>();
    return Number(row?.responses ?? 0);
  }

  // Palavras que classificam uma resposta livre como "consciente" (ver PDF
  // "Ajustes Dashboard", item 19). Correspondência por substring (case
  // insensitive) — cobre variações/conjugações naturalmente, já que várias
  // palavras da própria lista já são variações umas das outras
  // (financeira/financeiro/financeiramente). "permissao" sem acento é
  // incluído à parte pois nem toda resposta livre chega acentuada.
  private static readonly CONSCIOUSNESS_KEYWORDS = [
    'destravar',
    'dinheiro',
    'financeira',
    'financeiramente',
    'financeiro',
    'medo',
    'permissão',
    'permissao',
    'profissional',
    'prosperar',
    'prosperidade',
    'resolver',
    'resultados',
  ];

  // Conta form_response distintas cuja resposta em TEXTO LIVRE (answer_text)
  // contém pelo menos uma das CONSCIOUSNESS_KEYWORDS — substitui o antigo
  // critério baseado em opção de múltipla escolha (positive_option_key) só
  // para a métrica de consciência.
  private async queryConsciousnessKeywordCount(
    query: LaunchDashboardQueryDto,
    questionKey: string,
  ): Promise<number> {
    const qb = this.formAnswerRepo
      .createQueryBuilder('fa')
      .innerJoin(FormResponse, 'fr', 'fr.id = fa.form_response_id')
      .innerJoin(Capture, 'c', 'c.id = fr.capture_id')
      .innerJoin(
        Question,
        'q',
        'q.id = fa.question_id AND q.question_key = :questionKey',
        { questionKey },
      )
      .andWhere('fa.answer_text IS NOT NULL');

    const keywordConditions = LaunchDashboardService.CONSCIOUSNESS_KEYWORDS.map(
      (_keyword, index) => `fa.answer_text ILIKE :keyword${index}`,
    ).join(' OR ');
    const keywordParams = Object.fromEntries(
      LaunchDashboardService.CONSCIOUSNESS_KEYWORDS.map((keyword, index) => [
        `keyword${index}`,
        `%${keyword}%`,
      ]),
    );
    qb.andWhere(`(${keywordConditions})`, keywordParams);

    this.applyFormResponseFilters(qb, query);

    const row = await qb
      .select('COUNT(DISTINCT fr.id)', 'count')
      .getRawOne<{ count: string }>();
    return Number(row?.count ?? 0);
  }

  private async queryPositiveAnswerCount(
    query: LaunchDashboardQueryDto,
    questionKey: string,
    positiveOptionKey?: string,
  ): Promise<number> {
    const qb = this.formAnswerRepo
      .createQueryBuilder('fa')
      .innerJoin(FormResponse, 'fr', 'fr.id = fa.form_response_id')
      .innerJoin(Capture, 'c', 'c.id = fr.capture_id')
      .innerJoin(
        Question,
        'q',
        'q.id = fa.question_id AND q.question_key = :questionKey',
        { questionKey },
      );

    if (positiveOptionKey) {
      qb.innerJoin(
        QuestionOption,
        'qo',
        'qo.id = fa.option_id AND qo.option_key = :optionKey',
        { optionKey: positiveOptionKey },
      );
    }
    // sem positiveOptionKey: conta qualquer form_response que tenha uma linha de form_answer
    // para essa question_key — a existência da linha já indica que o lead respondeu

    this.applyFormResponseFilters(qb, query);

    const row = await qb
      .select('COUNT(DISTINCT fr.id)', 'count')
      .getRawOne<{ count: string }>();
    return Number(row?.count ?? 0);
  }

  private applyFormResponseFilters(
    qb: SelectQueryBuilder<any>,
    query: LaunchDashboardQueryDto,
  ) {
    if (query.launchId) {
      qb.andWhere('c.launch_id = :launchId', { launchId: query.launchId });
    }
    if (query.seasonId) {
      qb.andWhere('c.season_id = :seasonId', { seasonId: query.seasonId });
    }
    if (query.dateFrom) {
      qb.andWhere('COALESCE(c.occurred_at, c.created_at) >= :captureFrom', {
        captureFrom: `${query.dateFrom}T00:00:00.000Z`,
      });
    }
    if (query.dateTo) {
      qb.andWhere('COALESCE(c.occurred_at, c.created_at) < :captureTo', {
        captureTo: this.nextDay(query.dateTo),
      });
    }
  }

  // ─── Health score ─────────────────────────────────────────────────────────

  // Métricas elegíveis pro score de saúde: cada uma só entra na média se o
  // lançamento tiver a meta correspondente configurada. "Gasto" fica de fora
  // de propósito — estar acima/abaixo da meta de investimento não é
  // claramente bom ou ruim sem contexto de ritmo, então não vira nota.
  private static readonly HEALTH_SCORE_METRICS: {
    key: string;
    label: string;
    direction: 'higher_is_better' | 'lower_is_better';
  }[] = [
    { key: 'LEADS', label: 'Leads', direction: 'higher_is_better' },
    { key: 'CPL', label: 'Custo por lead', direction: 'lower_is_better' },
    {
      key: 'CONNECT_RATE',
      label: 'Connect rate',
      direction: 'higher_is_better',
    },
    {
      key: 'PAGE_CONVERSION',
      label: 'Conversão de páginas',
      direction: 'higher_is_better',
    },
    { key: 'CPC', label: 'CPC', direction: 'lower_is_better' },
    { key: 'CPM', label: 'CPM', direction: 'lower_is_better' },
    { key: 'CTR', label: 'CTR', direction: 'higher_is_better' },
    {
      key: 'SURVEY_RESPONSE_RATE',
      label: 'Taxa de resposta à pesquisa',
      direction: 'higher_is_better',
    },
    {
      key: 'CONSCIOUSNESS_RATE',
      label: 'Taxa de consciência',
      direction: 'higher_is_better',
    },
    {
      key: 'KNOWS_EXPERT_RATE',
      label: 'Taxa de conhece o especialista',
      direction: 'higher_is_better',
    },
    {
      key: 'KNOWS_ALLIANCE_RATE',
      label: 'Taxa de conhece Aliança',
      direction: 'higher_is_better',
    },
  ];

  async getHealthScore(query: LaunchDashboardQueryDto) {
    this.validateDates(query);

    const config = query.launchId ? await this.getConfig(query.launchId) : null;

    const [{ summary }, awareness] = await Promise.all([
      this.getSummary(query),
      this.getAwarenessMetrics(query),
    ]);

    const targetMap: Record<string, number | null | undefined> = {
      LEADS: config?.target_leads,
      CPL: config?.target_cpl,
      CONNECT_RATE: config?.target_connect_rate,
      PAGE_CONVERSION: config?.target_page_conversion,
      CPC: config?.target_cpc,
      CPM: config?.target_cpm,
      CTR: config?.target_ctr,
      SURVEY_RESPONSE_RATE: config?.target_survey_response_rate,
      CONSCIOUSNESS_RATE: config?.target_consciousness_rate,
      KNOWS_EXPERT_RATE: config?.target_knows_expert_rate,
      KNOWS_ALLIANCE_RATE: config?.target_knows_alliance_rate,
    };

    const currentMap: Record<string, number | null> = {
      LEADS: summary.leads,
      CPL: summary.cpl,
      CONNECT_RATE: summary.connectRate,
      PAGE_CONVERSION: summary.txPgvCheckout,
      CPC: summary.cpc,
      CPM: summary.cpm,
      CTR: summary.ctr,
      SURVEY_RESPONSE_RATE: awareness.surveyResponseRate,
      CONSCIOUSNESS_RATE: awareness.consciousnessRate,
      KNOWS_EXPERT_RATE: awareness.knowsExpertRate,
      KNOWS_ALLIANCE_RATE: awareness.knowsAllianceRate,
    };

    const metrics = LaunchDashboardService.HEALTH_SCORE_METRICS.map((m) => {
      const target = targetMap[m.key];
      const current = currentMap[m.key];

      if (target === null || target === undefined || target === 0) {
        return { ...m, current, target: target ?? null, score: null };
      }
      if (current === null) {
        return { ...m, current: null, target, score: null };
      }

      const ratio =
        m.direction === 'higher_is_better'
          ? current / target
          : target / current;
      const score = Math.max(0, Math.min(100, ratio * 100));

      return { ...m, current, target, score: Number(score.toFixed(2)) };
    });

    const scored = metrics.filter(
      (m): m is typeof m & { score: number } => m.score !== null,
    );
    const overallScore =
      scored.length > 0
        ? Number(
            (
              scored.reduce((sum, m) => sum + m.score, 0) / scored.length
            ).toFixed(2),
          )
        : null;

    const grade =
      overallScore === null
        ? null
        : overallScore >= 85
          ? 'A'
          : overallScore >= 70
            ? 'B'
            : overallScore >= 50
              ? 'C'
              : 'D';

    return { score: overallScore, grade, metrics };
  }

  // ─── Tier distribution ────────────────────────────────────────────────────

  async getTierDistribution(query: LaunchDashboardQueryDto) {
    this.validateDates(query);

    const qb = this.leadscoreResultRepo
      .createQueryBuilder('lr')
      .innerJoin(FormResponse, 'fr', 'fr.id = lr.form_response_id')
      .innerJoin(Capture, 'c', 'c.id = fr.capture_id')
      .innerJoin(LeadscoreTier, 'lt', 'lt.id = lr.tier_id');

    this.applyFormResponseFilters(qb, query);

    const rows = await qb
      .select('lt.code', 'tier')
      .addSelect('lt.name', 'tierName')
      .addSelect('COUNT(DISTINCT lr.id)', 'count')
      .groupBy('lt.code, lt.name')
      .orderBy('lt.code', 'ASC')
      .getRawMany<{ tier: string; tierName: string; count: string }>();

    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

    return {
      distribution: rows.map((r) => ({
        tier: r.tier,
        tierName: r.tierName,
        count: Number(r.count),
        percentage:
          total > 0 ? Number(((Number(r.count) / total) * 100).toFixed(2)) : 0,
      })),
      total,
    };
  }

  // ─── Ad accounts ──────────────────────────────────────────────────────────

  async getAdAccounts(_query: LaunchDashboardQueryDto) {
    const accounts = await this.connectionAccountRepo.find({
      where: { provider: 'meta_ads', selected: true },
      order: { external_account_name: 'ASC' },
    });

    return accounts.map((a) => ({
      externalAccountId: a.external_account_id,
      accountName: a.external_account_name ?? a.external_account_id,
    }));
  }

  // ─── Campaigns (para filtro por nome) ──────────────────────────────────────

  // dateFrom/dateTo aqui são opcionais de propósito — é uma lista pra popular
  // um select de campanha, então por padrão mostra todas as campanhas já
  // vistas pra conta selecionada, independente do período escolhido no filtro
  // principal da tela.
  async getCampaigns(query: LaunchDashboardQueryDto) {
    const qb = this.perfRepo.createQueryBuilder('p');
    this.applyMediaFilters(qb, query);
    qb.andWhere('p.external_campaign_id IS NOT NULL');

    const rows = await qb
      .select('p.external_campaign_id', 'value')
      .addSelect('MAX(p.campaign_name)', 'label')
      .groupBy('p.external_campaign_id')
      .orderBy('MAX(p.campaign_name)', 'ASC')
      .getRawMany<{ value: string; label: string | null }>();

    return rows.map((r) => ({ value: r.value, label: r.label ?? r.value }));
  }

  // ─── Media queries ────────────────────────────────────────────────────────

  private async queryMediaAggregated(
    query: LaunchDashboardQueryDto,
  ): Promise<MediaAgg> {
    const qb = this.perfRepo.createQueryBuilder('p');
    this.applyMediaFilters(qb, query);

    const row = await qb
      .select('COALESCE(SUM(CAST(p.spend AS NUMERIC)), 0)', 'spend')
      .addSelect(
        'COALESCE(SUM(CAST(p.impressions AS BIGINT)), 0)',
        'impressions',
      )
      // "Cliques"/CTR/CPC do dashboard usam link click (clique no link do anúncio),
      // não o clique genérico do Meta (que inclui curtida/comentário/etc).
      .addSelect(
        'COALESCE(SUM(CAST(p.inline_link_clicks AS BIGINT)), 0)',
        'clicks',
      )
      .addSelect(
        'COALESCE(SUM(CAST(p.inline_link_clicks AS BIGINT)), 0)',
        'inlineLinkClicks',
      )
      .addSelect(
        'COALESCE(SUM(CAST(p.landing_page_views AS BIGINT)), 0)',
        'landingPageViews',
      )
      .addSelect(
        'COALESCE(SUM(CAST(p.initiate_checkouts AS BIGINT)), 0)',
        'initiateCheckouts',
      )
      .getRawOne<Record<string, string>>();

    return {
      spend: Number(row?.spend ?? 0),
      impressions: Number(row?.impressions ?? 0),
      clicks: Number(row?.clicks ?? 0),
      inlineLinkClicks: Number(row?.inlineLinkClicks ?? 0),
      landingPageViews: Number(row?.landingPageViews ?? 0),
      initiateCheckouts: Number(row?.initiateCheckouts ?? 0),
    };
  }

  private async queryMediaTimeseries(query: LaunchDashboardQueryDto) {
    const qb = this.perfRepo.createQueryBuilder('p');
    this.applyMediaFilters(qb, query);

    const rows = await qb
      .select("TO_CHAR(p.report_date, 'YYYY-MM-DD')", 'date')
      .addSelect('COALESCE(SUM(CAST(p.spend AS NUMERIC)), 0)', 'spend')
      .addSelect(
        'COALESCE(SUM(CAST(p.impressions AS BIGINT)), 0)',
        'impressions',
      )
      // Ver nota em queryMediaAggregated: "clicks" = link click, não clique genérico.
      .addSelect(
        'COALESCE(SUM(CAST(p.inline_link_clicks AS BIGINT)), 0)',
        'clicks',
      )
      .groupBy('p.report_date')
      .orderBy('p.report_date', 'ASC')
      .getRawMany<Record<string, string>>();

    return rows.map((r) => ({
      date: r.date,
      spend: Number(r.spend ?? 0),
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
    }));
  }

  private async queryMediaByAd(
    query: LaunchDashboardQueryDto,
  ): Promise<FunnelAdRow[]> {
    const qb = this.perfRepo.createQueryBuilder('p');
    this.applyMediaFilters(qb, query);

    const rows = await qb
      .select('p.external_ad_id', 'externalAdId')
      .addSelect('MAX(p.ad_name)', 'adName')
      .addSelect('MAX(p.external_campaign_id)', 'externalCampaignId')
      .addSelect('MAX(p.campaign_name)', 'campaignName')
      .addSelect('MAX(p.external_adset_id)', 'externalAdsetId')
      .addSelect('MAX(p.adset_name)', 'adsetName')
      .addSelect('MAX(p.external_account_id)', 'externalAccountId')
      .addSelect('MAX(p.account_name)', 'accountName')
      .addSelect('COALESCE(SUM(CAST(p.spend AS NUMERIC)), 0)', 'spend')
      .addSelect(
        'COALESCE(SUM(CAST(p.impressions AS BIGINT)), 0)',
        'impressions',
      )
      // Ver nota em queryMediaAggregated: "clicks" = link click, não clique genérico.
      .addSelect(
        'COALESCE(SUM(CAST(p.inline_link_clicks AS BIGINT)), 0)',
        'clicks',
      )
      .addSelect(
        'COALESCE(SUM(CAST(p.inline_link_clicks AS BIGINT)), 0)',
        'inlineLinkClicks',
      )
      .addSelect(
        'COALESCE(SUM(CAST(p.landing_page_views AS BIGINT)), 0)',
        'landingPageViews',
      )
      .addSelect(
        'COALESCE(SUM(CAST(p.initiate_checkouts AS BIGINT)), 0)',
        'initiateCheckouts',
      )
      .groupBy('p.external_ad_id')
      .orderBy('SUM(CAST(p.spend AS NUMERIC))', 'DESC')
      .getRawMany<Record<string, string>>();

    return rows.map((r) => ({
      externalAdId: r.externalAdId,
      adName: r.adName ?? null,
      externalCampaignId: r.externalCampaignId ?? null,
      campaignName: r.campaignName ?? null,
      externalAdsetId: r.externalAdsetId ?? null,
      adsetName: r.adsetName ?? null,
      externalAccountId: r.externalAccountId,
      accountName: r.accountName ?? null,
      spend: Number(r.spend ?? 0),
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
      inlineLinkClicks: Number(r.inlineLinkClicks ?? 0),
      landingPageViews: Number(r.landingPageViews ?? 0),
      initiateCheckouts: Number(r.initiateCheckouts ?? 0),
    }));
  }

  private applyMediaFilters(
    qb: ReturnType<Repository<MetaAdPerformance>['createQueryBuilder']>,
    query: LaunchDashboardQueryDto,
  ) {
    if (query.dateFrom) {
      qb.andWhere('p.report_date >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('p.report_date <= :dateTo', { dateTo: query.dateTo });
    }
    if (query.externalAccountId) {
      const ids = query.externalAccountId
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 1) {
        qb.andWhere('p.external_account_id = :externalAccountId', {
          externalAccountId: ids[0],
        });
      } else if (ids.length > 1) {
        qb.andWhere('p.external_account_id IN (:...externalAccountIds)', {
          externalAccountIds: ids,
        });
      }
    }
    if (query.externalCampaignId) {
      qb.andWhere('p.external_campaign_id = :externalCampaignId', {
        externalCampaignId: query.externalCampaignId,
      });
    }
    if (query.externalAdsetId) {
      qb.andWhere('p.external_adset_id = :externalAdsetId', {
        externalAdsetId: query.externalAdsetId,
      });
    }
    if (query.externalAdId) {
      qb.andWhere('p.external_ad_id = :externalAdId', {
        externalAdId: query.externalAdId,
      });
    }
  }

  // ─── Capture / leads queries ──────────────────────────────────────────────

  private async queryLeadsCount(
    query: LaunchDashboardQueryDto,
  ): Promise<number> {
    const qb = this.captureRepo.createQueryBuilder('c');
    this.applyCaptureFilters(qb, query);
    qb.andWhere('c.person_id IS NOT NULL');
    const row = await qb
      .select('COUNT(DISTINCT c.person_id)', 'leads')
      .getRawOne<{ leads: string }>();
    return Number(row?.leads ?? 0);
  }

  // Leads com temperature.abbreviation = 'org' (cadastro orgânico, sem
  // origem de tráfego pago) — mesmo seed usado em lead-persistence.service.ts.
  private async queryOrganicLeadsCount(
    query: LaunchDashboardQueryDto,
  ): Promise<number> {
    const qb = this.captureRepo.createQueryBuilder('c');
    this.applyCaptureFilters(qb, query);
    qb.innerJoin(
      Temperature,
      't',
      't.id = c.temperature_id AND t.abbreviation = :abbr',
      { abbr: 'org' },
    );
    qb.andWhere('c.person_id IS NOT NULL');
    const row = await qb
      .select('COUNT(DISTINCT c.person_id)', 'leads')
      .getRawOne<{ leads: string }>();
    return Number(row?.leads ?? 0);
  }

  private async queryLeadsTimeseries(query: LaunchDashboardQueryDto) {
    const qb = this.captureRepo.createQueryBuilder('c');
    this.applyCaptureFilters(qb, query);
    qb.andWhere('c.person_id IS NOT NULL');

    const rows = await qb
      .select(
        "TO_CHAR(DATE(COALESCE(c.occurred_at, c.created_at)), 'YYYY-MM-DD')",
        'date',
      )
      .addSelect('COUNT(DISTINCT c.person_id)', 'leads')
      .groupBy('DATE(COALESCE(c.occurred_at, c.created_at))')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; leads: string }>();

    return rows.map((r) => ({ date: r.date, leads: Number(r.leads ?? 0) }));
  }

  private async queryLeadsByAd(
    query: LaunchDashboardQueryDto,
  ): Promise<Map<string, number>> {
    const qb = this.captureRepo.createQueryBuilder('c');
    this.applyCaptureFilters(qb, query);
    qb.andWhere('c.person_id IS NOT NULL');
    qb.andWhere('c.external_ad_id IS NOT NULL');

    const rows = await qb
      .select('c.external_ad_id', 'externalAdId')
      .addSelect('COUNT(DISTINCT c.person_id)', 'leads')
      .groupBy('c.external_ad_id')
      .getRawMany<{ externalAdId: string; leads: string }>();

    return new Map(rows.map((r) => [r.externalAdId, Number(r.leads ?? 0)]));
  }

  private applyCaptureFilters(
    qb: ReturnType<Repository<Capture>['createQueryBuilder']>,
    query: LaunchDashboardQueryDto,
  ) {
    if (query.launchId) {
      qb.andWhere('c.launch_id = :launchId', { launchId: query.launchId });
    }
    if (query.seasonId) {
      qb.andWhere('c.season_id = :seasonId', { seasonId: query.seasonId });
    }
    if (query.dateFrom) {
      qb.andWhere('COALESCE(c.occurred_at, c.created_at) >= :captureFrom', {
        captureFrom: `${query.dateFrom}T00:00:00.000Z`,
      });
    }
    if (query.dateTo) {
      qb.andWhere('COALESCE(c.occurred_at, c.created_at) < :captureTo', {
        captureTo: this.nextDay(query.dateTo),
      });
    }
    if (query.externalAdId) {
      qb.andWhere('c.external_ad_id = :externalAdId', {
        externalAdId: query.externalAdId,
      });
    }
  }

  // ─── Hotmart sales queries ────────────────────────────────────────────────

  private async querySalesAggregated(
    query: LaunchDashboardQueryDto,
  ): Promise<{ sales: number; revenue: number }> {
    const qb = this.buildDirectSalesQb(query);
    const row = await qb
      .select('COUNT(DISTINCT hs.id)', 'sales')
      .addSelect('COALESCE(SUM(hs.price), 0)', 'revenue')
      .getRawOne<{ sales: string; revenue: string }>();

    return {
      sales: Number(row?.sales ?? 0),
      revenue: Number(row?.revenue ?? 0),
    };
  }

  private async querySalesTimeseries(query: LaunchDashboardQueryDto) {
    const qb = this.buildDirectSalesQb(query);

    const rows = await qb
      .select(
        "TO_CHAR(DATE(COALESCE(hs.approved_date, hs.order_date)), 'YYYY-MM-DD')",
        'date',
      )
      .addSelect('COUNT(DISTINCT hs.id)', 'sales')
      .andWhere('COALESCE(hs.approved_date, hs.order_date) IS NOT NULL')
      .groupBy('DATE(COALESCE(hs.approved_date, hs.order_date))')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; sales: string }>();

    return rows.map((r) => ({ date: r.date, sales: Number(r.sales ?? 0) }));
  }

  private async querySalesByAd(
    query: LaunchDashboardQueryDto,
  ): Promise<Map<string, { sales: number; revenue: number }>> {
    const qb = this.buildAttributedSalesQb(query);

    const rows = await qb
      .select('c.external_ad_id', 'externalAdId')
      .addSelect('COUNT(DISTINCT hs.id)', 'sales')
      .addSelect('COALESCE(SUM(hs.price), 0)', 'revenue')
      .andWhere('c.external_ad_id IS NOT NULL')
      .groupBy('c.external_ad_id')
      .getRawMany<{ externalAdId: string; sales: string; revenue: string }>();

    return new Map(
      rows.map((r) => [
        r.externalAdId,
        { sales: Number(r.sales ?? 0), revenue: Number(r.revenue ?? 0) },
      ]),
    );
  }

  // Direct join via hotmart_product — counts all sales for the launch's active products.
  private buildDirectSalesQb(query: LaunchDashboardQueryDto) {
    const qb = this.saleRepo
      .createQueryBuilder('hs')
      .innerJoin(
        HotmartProduct,
        'hp',
        'hp.product_id = hs.product_id AND hp.active = true',
      )
      .andWhere(`hs.purchase_status IN ('APPROVED', 'COMPLETE')`);

    if (query.launchId) {
      qb.andWhere('hp.launch_id = :launchId', { launchId: query.launchId });
    }
    if (query.dateFrom) {
      qb.andWhere('COALESCE(hs.approved_date, hs.order_date) >= :salesFrom', {
        salesFrom: `${query.dateFrom}T00:00:00.000Z`,
      });
    }
    if (query.dateTo) {
      qb.andWhere('COALESCE(hs.approved_date, hs.order_date) < :salesTo', {
        salesTo: this.nextDay(query.dateTo),
      });
    }

    return qb;
  }

  // Capture bridge — attributes sales to specific ads via person_id.
  private buildAttributedSalesQb(query: LaunchDashboardQueryDto) {
    const qb = this.captureRepo
      .createQueryBuilder('c')
      .innerJoin(HotmartSale, 'hs', 'hs.person_id = c.person_id')
      .andWhere('c.person_id IS NOT NULL')
      .andWhere(`hs.purchase_status IN ('APPROVED', 'COMPLETE')`);

    if (query.launchId) {
      qb.andWhere('c.launch_id = :launchId', { launchId: query.launchId });
      qb.andWhere(
        `EXISTS (SELECT 1 FROM "hotmart_product" hp2 WHERE hp2.product_id = hs.product_id AND hp2.launch_id = :launchIdProd AND hp2.active = true)`,
        { launchIdProd: query.launchId },
      );
    }
    if (query.seasonId) {
      qb.andWhere('c.season_id = :seasonId', { seasonId: query.seasonId });
    }
    if (query.dateFrom) {
      qb.andWhere('COALESCE(hs.approved_date, hs.order_date) >= :salesFrom', {
        salesFrom: `${query.dateFrom}T00:00:00.000Z`,
      });
    }
    if (query.dateTo) {
      qb.andWhere('COALESCE(hs.approved_date, hs.order_date) < :salesTo', {
        salesTo: this.nextDay(query.dateTo),
      });
    }

    return qb;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private buildSummaryMetrics(
    media: MediaAgg,
    leadsCount: number,
    salesData: { sales: number; revenue: number },
    organicLeadsCount = 0,
  ) {
    return {
      spend: media.spend,
      impressions: media.impressions,
      clicks: media.clicks,
      inlineLinkClicks: media.inlineLinkClicks,
      landingPageViews: media.landingPageViews,
      leads: leadsCount,
      organicLeads: organicLeadsCount,
      initiateCheckouts: media.initiateCheckouts,
      sales: salesData.sales,
      revenue: salesData.revenue,
      ctr: this.div(media.clicks, media.impressions),
      cpc: this.div(media.spend, media.clicks),
      cpm:
        media.impressions > 0
          ? Number(((media.spend * 1000) / media.impressions).toFixed(6))
          : null,
      connectRate: this.div(media.landingPageViews, media.inlineLinkClicks),
      txPgvCheckout: this.div(media.initiateCheckouts, media.landingPageViews),
      txCheckoutSale: this.div(salesData.sales, media.initiateCheckouts),
      cpl: this.div(media.spend, leadsCount),
      cpa: this.div(media.spend, salesData.sales),
    };
  }

  private div(numerator: number, denominator: number): number | null {
    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator <= 0
    ) {
      return null;
    }
    return Number((numerator / denominator).toFixed(6));
  }

  private validateDates(query: LaunchDashboardQueryDto) {
    if (!query.dateFrom || !query.dateTo) {
      throw new BadRequestException('dateFrom e dateTo sao obrigatorios.');
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(query.dateFrom) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(query.dateTo)
    ) {
      throw new BadRequestException(
        'dateFrom e dateTo devem estar no formato YYYY-MM-DD.',
      );
    }
  }

  private nextDay(date: string): string {
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString();
  }

  private subtractDays(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  private dateRange(from: string, to: string): string[] {
    const dates: string[] = [];
    const cur = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T00:00:00.000Z`);
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return dates;
  }
}
