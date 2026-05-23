import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Capture } from '../database/entities/capture/capture.entity';
import { HotmartSale } from '../database/entities/hotmart/hotmart-sale.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { MetaAdPerformance } from '../database/entities/meta-ads/meta-ad-performance.entity';
import { LaunchDashboardQueryDto } from './dto/launch-dashboard-query.dto';

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
  ) {}

  async getLaunches() {
    return this.launchRepo.find({ order: { name: 'ASC' } });
  }

  async getSummary(query: LaunchDashboardQueryDto) {
    this.validateDates(query);

    const [media, leadsCount, salesData] = await Promise.all([
      this.queryMediaAggregated(query),
      this.queryLeadsCount(query),
      this.querySalesAggregated(query),
    ]);

    return {
      summary: this.buildSummaryMetrics(media, leadsCount, salesData),
    };
  }

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

  async getFunnelTable(query: LaunchDashboardQueryDto) {
    this.validateDates(query);

    const [mediaRows, leadsByAd, salesByAd] = await Promise.all([
      this.queryMediaByAd(query),
      this.queryLeadsByAd(query),
      this.querySalesByAd(query),
    ]);

    const items = mediaRows.map((row) => {
      const leads = leadsByAd.get(row.externalAdId) ?? 0;
      const sale = salesByAd.get(row.externalAdId) ?? { sales: 0, revenue: 0 };

      return {
        ...row,
        leads,
        sales: sale.sales,
        revenue: sale.revenue,
        ctr: this.div(row.clicks, row.impressions),
        cpc: this.div(row.spend, row.clicks),
        cpm:
          row.impressions > 0
            ? Number(((row.spend * 1000) / row.impressions).toFixed(6))
            : null,
        connectRate: this.div(row.landingPageViews, row.inlineLinkClicks),
        txPgvCheckout: this.div(row.initiateCheckouts, row.landingPageViews),
        txCheckoutSale: this.div(sale.sales, row.initiateCheckouts),
        cpl: this.div(row.spend, leads),
        cpa: this.div(row.spend, sale.sales),
      };
    });

    items.sort((a, b) => b.spend - a.spend);

    return { items, total: items.length };
  }

  // ─── Media queries ────────────────────────────────────────────────────────

  private async queryMediaAggregated(query: LaunchDashboardQueryDto): Promise<MediaAgg> {
    const qb = this.perfRepo.createQueryBuilder('p');
    this.applyMediaFilters(qb, query);

    const row = await qb
      .select('COALESCE(SUM(CAST(p.spend AS NUMERIC)), 0)', 'spend')
      .addSelect('COALESCE(SUM(CAST(p.impressions AS BIGINT)), 0)', 'impressions')
      .addSelect('COALESCE(SUM(CAST(p.clicks AS BIGINT)), 0)', 'clicks')
      .addSelect('COALESCE(SUM(CAST(p.inline_link_clicks AS BIGINT)), 0)', 'inlineLinkClicks')
      .addSelect('COALESCE(SUM(CAST(p.landing_page_views AS BIGINT)), 0)', 'landingPageViews')
      .addSelect('COALESCE(SUM(CAST(p.initiate_checkouts AS BIGINT)), 0)', 'initiateCheckouts')
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
      .addSelect('COALESCE(SUM(CAST(p.impressions AS BIGINT)), 0)', 'impressions')
      .addSelect('COALESCE(SUM(CAST(p.clicks AS BIGINT)), 0)', 'clicks')
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

  private async queryMediaByAd(query: LaunchDashboardQueryDto): Promise<FunnelAdRow[]> {
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
      .addSelect('COALESCE(SUM(CAST(p.impressions AS BIGINT)), 0)', 'impressions')
      .addSelect('COALESCE(SUM(CAST(p.clicks AS BIGINT)), 0)', 'clicks')
      .addSelect('COALESCE(SUM(CAST(p.inline_link_clicks AS BIGINT)), 0)', 'inlineLinkClicks')
      .addSelect('COALESCE(SUM(CAST(p.landing_page_views AS BIGINT)), 0)', 'landingPageViews')
      .addSelect('COALESCE(SUM(CAST(p.initiate_checkouts AS BIGINT)), 0)', 'initiateCheckouts')
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
      qb.andWhere('p.external_account_id = :externalAccountId', {
        externalAccountId: query.externalAccountId,
      });
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

  private async queryLeadsCount(query: LaunchDashboardQueryDto): Promise<number> {
    const qb = this.captureRepo.createQueryBuilder('c');
    this.applyCaptureFilters(qb, query);
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
      .groupBy("DATE(COALESCE(c.occurred_at, c.created_at))")
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
        captureTo: this.nextDay(query.dateTo!),
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
    if (!query.launchId && !query.seasonId) return { sales: 0, revenue: 0 };

    const qb = this.buildSalesJoinQb(query);
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
    if (!query.launchId && !query.seasonId) return [];

    const qb = this.buildSalesJoinQb(query);

    const rows = await qb
      .select(
        "TO_CHAR(DATE(COALESCE(hs.approved_date, hs.order_date)), 'YYYY-MM-DD')",
        'date',
      )
      .addSelect('COUNT(DISTINCT hs.id)', 'sales')
      .andWhere('COALESCE(hs.approved_date, hs.order_date) IS NOT NULL')
      .groupBy("DATE(COALESCE(hs.approved_date, hs.order_date))")
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; sales: string }>();

    return rows.map((r) => ({ date: r.date, sales: Number(r.sales ?? 0) }));
  }

  private async querySalesByAd(
    query: LaunchDashboardQueryDto,
  ): Promise<Map<string, { sales: number; revenue: number }>> {
    if (!query.launchId && !query.seasonId) return new Map();

    const qb = this.buildSalesJoinQb(query);

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

  private buildSalesJoinQb(query: LaunchDashboardQueryDto) {
    const qb = this.captureRepo
      .createQueryBuilder('c')
      .innerJoin(HotmartSale, 'hs', 'hs.person_id = c.person_id')
      .andWhere('c.person_id IS NOT NULL')
      .andWhere(`hs.purchase_status = 'APPROVED'`);

    if (query.launchId) {
      qb.andWhere('c.launch_id = :launchId', { launchId: query.launchId });
    }
    if (query.seasonId) {
      qb.andWhere('c.season_id = :seasonId', { seasonId: query.seasonId });
    }

    return qb;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private buildSummaryMetrics(
    media: MediaAgg,
    leadsCount: number,
    salesData: { sales: number; revenue: number },
  ) {
    return {
      spend: media.spend,
      impressions: media.impressions,
      clicks: media.clicks,
      inlineLinkClicks: media.inlineLinkClicks,
      landingPageViews: media.landingPageViews,
      leads: leadsCount,
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
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
      return null;
    }
    return Number((numerator / denominator).toFixed(6));
  }

  private validateDates(query: LaunchDashboardQueryDto) {
    if (!query.dateFrom || !query.dateTo) {
      throw new BadRequestException('dateFrom e dateTo sao obrigatorios.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(query.dateTo)) {
      throw new BadRequestException('dateFrom e dateTo devem estar no formato YYYY-MM-DD.');
    }
  }

  private nextDay(date: string): string {
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString();
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
