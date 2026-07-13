import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetaAdPerformance } from '../../database/entities/meta-ads/meta-ad-performance.entity';
import { Launch } from '../../database/entities/marketing/launch.entity';
import { LaunchDashboardConfig } from '../../database/entities/launch-dashboard/launch-dashboard-config.entity';
import { LaunchDashboardService } from '../../launch-dashboard/launch-dashboard.service';
import { CopilotLlmService } from './copilot-llm.service';
import { CopilotConfigService } from './copilot-config.service';
import { CopilotRiskAlertsService } from './copilot-risk-alerts.service';

type AdDailyRow = {
  externalAdId: string;
  adName: string | null;
  campaignName: string | null;
  reportDate: string;
  spend: number;
  impressions: number;
  clicks: number;
  landingPageViews: number;
  initiateCheckouts: number;
  leads: number;
};

const RECENT_WINDOW_DAYS = 2;
const BASELINE_WINDOW_DAYS = 7;
const MIN_BASELINE_DAYS = 3;
const BASE_SPIKE_THRESHOLD_PCT = 30;
const BASE_DROP_THRESHOLD_PCT = 30;
const BASE_TARGET_BREACH_THRESHOLD_PCT = 15;
const ZERO_CONVERSION_BASE_SPEND_FLOOR = 50;

@Injectable()
export class CopilotRiskEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CopilotRiskEngineService.name);
  private intervalHandle?: ReturnType<typeof setInterval>;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MetaAdPerformance)
    private readonly perfRepo: Repository<MetaAdPerformance>,
    @InjectRepository(Launch)
    private readonly launchRepo: Repository<Launch>,
    @InjectRepository(LaunchDashboardConfig)
    private readonly launchConfigRepo: Repository<LaunchDashboardConfig>,
    private readonly dashboardService: LaunchDashboardService,
    private readonly llm: CopilotLlmService,
    private readonly copilotConfig: CopilotConfigService,
    private readonly riskAlerts: CopilotRiskAlertsService,
  ) {}

  onModuleInit() {
    const enabled =
      this.configService.get<string>('COPILOT_RISK_SCAN_ENABLED') === 'true';
    if (!enabled) {
      this.logger.log(
        'Copilot risk scan disabled (COPILOT_RISK_SCAN_ENABLED != true)',
      );
      return;
    }

    const intervalMinutes = parseInt(
      this.configService.get<string>('COPILOT_RISK_SCAN_INTERVAL_MINUTES') ??
        '60',
      10,
    );

    this.logger.log(`Copilot risk scan started: every ${intervalMinutes}min`);
    void this.scanAllLaunches();
    this.intervalHandle = setInterval(
      () => void this.scanAllLaunches(),
      intervalMinutes * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }

  // Reaproveita a mesma janela configurada pelo recurso de notificações
  // (notification_date_from/notification_date_to em launch_dashboard_config)
  // como "janela ativa" do lançamento — evita criar mais um campo de config
  // pra a mesma ideia de "período que estamos de olho".
  async scanAllLaunches(): Promise<void> {
    const configs = await this.launchConfigRepo
      .createQueryBuilder('c')
      .where('c.notification_date_from IS NOT NULL')
      .andWhere('c.notification_date_to IS NOT NULL')
      .getMany();

    for (const config of configs) {
      try {
        await this.scanLaunch(config);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Falha ao escanear lançamento ${config.launch_id}: ${msg}`,
        );
      }
    }
  }

  private async scanLaunch(launchConfig: LaunchDashboardConfig): Promise<void> {
    const launch = await this.launchRepo.findOne({
      where: { id: launchConfig.launch_id },
    });
    if (!launch) return;

    const copilotConfig = await this.copilotConfig.getConfig(
      launchConfig.launch_id,
    );
    const multiplier =
      this.copilotConfig.getSensitivityMultiplier(copilotConfig);

    // Garantido não-nulo pelo filtro WHERE em scanAllLaunches().
    const notificationDateFrom = String(launchConfig.notification_date_from);
    const notificationDateTo = String(launchConfig.notification_date_to);

    const today = new Date();
    const windowTo = this.minDate(notificationDateTo, this.toDateStr(today));
    const windowFrom = this.subtractDays(
      windowTo,
      BASELINE_WINDOW_DAYS + RECENT_WINDOW_DAYS,
    );
    const effectiveFrom = this.maxDate(windowFrom, notificationDateFrom);

    const dailyRows = await this.queryAdDailyMetrics(effectiveFrom, windowTo);
    if (dailyRows.length === 0) return;

    const byAd = this.groupByAd(dailyRows);

    for (const [externalAdId, rows] of byAd.entries()) {
      rows.sort((a, b) => (a.reportDate < b.reportDate ? -1 : 1));
      const recent = rows.slice(-RECENT_WINDOW_DAYS);
      const baseline = rows.slice(0, -RECENT_WINDOW_DAYS);
      if (baseline.length < MIN_BASELINE_DAYS || recent.length === 0) continue;

      const adName = recent[recent.length - 1].adName ?? externalAdId;
      const campaignName = recent[recent.length - 1].campaignName ?? null;
      const detectedOn = recent[recent.length - 1].reportDate;

      await this.evaluateSpikeRule({
        ruleKey: 'CPL_SPIKE',
        metricLabel: 'CPL (custo por lead)',
        recentValue: this.rate(
          this.sum(recent, 'spend'),
          this.sum(recent, 'leads'),
        ),
        baselineValue: this.rate(
          this.sum(baseline, 'spend'),
          this.sum(baseline, 'leads'),
        ),
        launch,
        launchConfig,
        externalAdId,
        adName,
        campaignName,
        detectedOn,
        multiplier,
        copilotConfig,
        higherIsWorse: true,
      });

      await this.evaluateSpikeRule({
        ruleKey: 'CPC_SPIKE',
        metricLabel: 'CPC (custo por clique)',
        recentValue: this.rate(
          this.sum(recent, 'spend'),
          this.sum(recent, 'clicks'),
        ),
        baselineValue: this.rate(
          this.sum(baseline, 'spend'),
          this.sum(baseline, 'clicks'),
        ),
        launch,
        launchConfig,
        externalAdId,
        adName,
        campaignName,
        detectedOn,
        multiplier,
        copilotConfig,
        higherIsWorse: true,
      });

      await this.evaluateSpikeRule({
        ruleKey: 'CTR_DROP',
        metricLabel: 'CTR (taxa de clique)',
        recentValue: this.rate(
          this.sum(recent, 'clicks'),
          this.sum(recent, 'impressions'),
        ),
        baselineValue: this.rate(
          this.sum(baseline, 'clicks'),
          this.sum(baseline, 'impressions'),
        ),
        launch,
        launchConfig,
        externalAdId,
        adName,
        campaignName,
        detectedOn,
        multiplier,
        copilotConfig,
        higherIsWorse: false,
      });

      await this.evaluateSpikeRule({
        ruleKey: 'CONNECT_RATE_DROP',
        metricLabel: 'connect rate',
        recentValue: this.rate(
          this.sum(recent, 'landingPageViews'),
          this.sum(recent, 'clicks'),
        ),
        baselineValue: this.rate(
          this.sum(baseline, 'landingPageViews'),
          this.sum(baseline, 'clicks'),
        ),
        launch,
        launchConfig,
        externalAdId,
        adName,
        campaignName,
        detectedOn,
        multiplier,
        copilotConfig,
        higherIsWorse: false,
      });

      await this.evaluateZeroConversion({
        launch,
        launchConfig,
        externalAdId,
        adName,
        campaignName,
        latestDay: recent[recent.length - 1],
        multiplier,
        copilotConfig,
      });
    }

    await this.evaluateTargetBreach(
      launch,
      launchConfig,
      copilotConfig,
      multiplier,
    );
  }

  private async evaluateSpikeRule(params: {
    ruleKey: string;
    metricLabel: string;
    recentValue: number | null;
    baselineValue: number | null;
    launch: Launch;
    launchConfig: LaunchDashboardConfig;
    externalAdId: string;
    adName: string;
    campaignName: string | null;
    detectedOn: string;
    multiplier: number;
    copilotConfig: Awaited<ReturnType<CopilotConfigService['getConfig']>>;
    higherIsWorse: boolean;
  }): Promise<void> {
    if (!this.copilotConfig.isRuleEnabled(params.copilotConfig, params.ruleKey))
      return;
    if (
      params.recentValue === null ||
      params.baselineValue === null ||
      params.baselineValue === 0
    ) {
      return;
    }

    const pctDiff =
      ((params.recentValue - params.baselineValue) / params.baselineValue) *
      100;
    const threshold =
      (params.ruleKey.endsWith('_DROP')
        ? BASE_DROP_THRESHOLD_PCT
        : BASE_SPIKE_THRESHOLD_PCT) * params.multiplier;

    const isBad = params.higherIsWorse
      ? pctDiff > threshold
      : pctDiff < -threshold;
    if (!isBad) return;

    await this.raiseAlert({
      launch: params.launch,
      launchConfig: params.launchConfig,
      externalAdId: params.externalAdId,
      adName: params.adName,
      campaignName: params.campaignName,
      ruleKey: params.ruleKey,
      detectedOn: params.detectedOn,
      metricLabel: params.metricLabel,
      currentValue: params.recentValue,
      baselineValue: params.baselineValue,
      pctDiff,
      titleFallback: `${params.metricLabel} do anúncio "${params.adName}" ${
        params.higherIsWorse ? 'subiu' : 'caiu'
      } ${Math.abs(pctDiff).toFixed(0)}%`,
    });
  }

  private async evaluateZeroConversion(params: {
    launch: Launch;
    launchConfig: LaunchDashboardConfig;
    externalAdId: string;
    adName: string;
    campaignName: string | null;
    latestDay: AdDailyRow;
    multiplier: number;
    copilotConfig: Awaited<ReturnType<CopilotConfigService['getConfig']>>;
  }): Promise<void> {
    if (
      !this.copilotConfig.isRuleEnabled(params.copilotConfig, 'ZERO_CONVERSION')
    )
      return;

    const spendFloor = ZERO_CONVERSION_BASE_SPEND_FLOOR * params.multiplier;
    const { spend, leads, initiateCheckouts } = params.latestDay;
    if (spend < spendFloor || leads > 0 || initiateCheckouts > 0) return;

    await this.raiseAlert({
      launch: params.launch,
      launchConfig: params.launchConfig,
      externalAdId: params.externalAdId,
      adName: params.adName,
      campaignName: params.campaignName,
      ruleKey: 'ZERO_CONVERSION',
      detectedOn: params.latestDay.reportDate,
      metricLabel: 'leads/checkouts com gasto ativo',
      currentValue: 0,
      baselineValue: null,
      pctDiff: null,
      titleFallback: `Anúncio "${params.adName}" gastou R$${spend.toFixed(2)} sem gerar lead nem checkout`,
    });
  }

  private async evaluateTargetBreach(
    launch: Launch,
    launchConfig: LaunchDashboardConfig,
    copilotConfig: Awaited<ReturnType<CopilotConfigService['getConfig']>>,
    multiplier: number,
  ): Promise<void> {
    if (!this.copilotConfig.isRuleEnabled(copilotConfig, 'TARGET_BREACH_CPL'))
      return;
    const targetCpl = Number(launchConfig.target_cpl);
    if (!targetCpl) return;

    const windowTo = this.minDate(
      String(launchConfig.notification_date_to),
      this.toDateStr(new Date()),
    );
    const windowFrom = this.subtractDays(windowTo, 3);

    const { summary } = await this.dashboardService.getSummary({
      launchId: launch.id,
      dateFrom: windowFrom,
      dateTo: windowTo,
    });

    if (summary.cpl === null) return;

    const pctDiff = ((summary.cpl - targetCpl) / targetCpl) * 100;
    if (pctDiff <= BASE_TARGET_BREACH_THRESHOLD_PCT * multiplier) return;

    await this.raiseAlert({
      launch,
      launchConfig,
      externalAdId: null,
      adName: null,
      campaignName: null,
      ruleKey: 'TARGET_BREACH_CPL',
      detectedOn: windowTo,
      metricLabel: 'CPL (custo por lead)',
      currentValue: summary.cpl,
      baselineValue: targetCpl,
      pctDiff,
      titleFallback: `CPL do lançamento "${launch.name}" está ${pctDiff.toFixed(0)}% acima da meta`,
    });
  }

  private async raiseAlert(params: {
    launch: Launch;
    launchConfig: LaunchDashboardConfig;
    externalAdId: string | null;
    adName: string | null;
    campaignName: string | null;
    ruleKey: string;
    detectedOn: string;
    metricLabel: string;
    currentValue: number | null;
    baselineValue: number | null;
    pctDiff: number | null;
    titleFallback: string;
  }): Promise<void> {
    // Checa dedupe ANTES de chamar a LLM — evita gastar uma chamada por ciclo
    // de scan pra um risco que já foi alertado hoje (a LLM só é usada pra
    // explicar um sinal novo, nunca pra re-confirmar um sinal já conhecido).
    const alreadyAlerted = await this.riskAlerts.exists(
      params.launch.id,
      params.externalAdId,
      params.ruleKey,
      params.detectedOn,
    );
    if (alreadyAlerted) return;

    const copilotConfig = await this.copilotConfig.getConfig(params.launch.id);

    let narrative: string | null = null;
    let recommendation: string | null = null;
    let severity: 'info' | 'warning' | 'critical' = 'warning';

    try {
      const explanation = await this.llm.explainRiskSignal({
        launchName: params.launch.name,
        ruleKey: params.ruleKey,
        metricLabel: params.metricLabel,
        currentValue: params.currentValue,
        baselineValue: params.baselineValue,
        pctDiff: params.pctDiff,
        adName: params.adName,
        campaignName: params.campaignName,
        extraContext: copilotConfig?.extra_context,
      });
      narrative = explanation.narrative;
      recommendation = explanation.recommendation;
      severity = explanation.severity;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao gerar narrativa via LLM: ${msg}`);
    }

    const created = await this.riskAlerts.createIfNotExists({
      launchId: params.launch.id,
      externalAdId: params.externalAdId,
      adName: params.adName,
      ruleKey: params.ruleKey,
      detectedOn: params.detectedOn,
      severity,
      title: params.titleFallback,
      narrative,
      recommendation,
      currentValue: params.currentValue,
      baselineValue: params.baselineValue,
      pctDiff: params.pctDiff,
    });

    if (created) {
      this.logger.log(
        `Alerta criado: ${params.ruleKey} — ${params.titleFallback}`,
      );
    }
  }

  private async queryAdDailyMetrics(
    dateFrom: string,
    dateTo: string,
  ): Promise<AdDailyRow[]> {
    const rows = await this.perfRepo
      .createQueryBuilder('p')
      .select('p.external_ad_id', 'externalAdId')
      .addSelect('MAX(p.ad_name)', 'adName')
      .addSelect('MAX(p.campaign_name)', 'campaignName')
      .addSelect("TO_CHAR(p.report_date, 'YYYY-MM-DD')", 'reportDate')
      .addSelect('COALESCE(SUM(CAST(p.spend AS NUMERIC)), 0)', 'spend')
      .addSelect(
        'COALESCE(SUM(CAST(p.impressions AS BIGINT)), 0)',
        'impressions',
      )
      .addSelect('COALESCE(SUM(CAST(p.clicks AS BIGINT)), 0)', 'clicks')
      .addSelect(
        'COALESCE(SUM(CAST(p.landing_page_views AS BIGINT)), 0)',
        'landingPageViews',
      )
      .addSelect(
        'COALESCE(SUM(CAST(p.initiate_checkouts AS BIGINT)), 0)',
        'initiateCheckouts',
      )
      .addSelect('COALESCE(SUM(CAST(p.leads AS NUMERIC)), 0)', 'leads')
      .where('p.report_date >= :dateFrom', { dateFrom })
      .andWhere('p.report_date <= :dateTo', { dateTo })
      .groupBy('p.external_ad_id')
      .addGroupBy('p.report_date')
      .getRawMany<Record<string, string>>();

    return rows.map((r) => ({
      externalAdId: r.externalAdId,
      adName: r.adName ?? null,
      campaignName: r.campaignName ?? null,
      reportDate: r.reportDate,
      spend: Number(r.spend ?? 0),
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
      landingPageViews: Number(r.landingPageViews ?? 0),
      initiateCheckouts: Number(r.initiateCheckouts ?? 0),
      leads: Number(r.leads ?? 0),
    }));
  }

  private groupByAd(rows: AdDailyRow[]): Map<string, AdDailyRow[]> {
    const map = new Map<string, AdDailyRow[]>();
    for (const row of rows) {
      const list = map.get(row.externalAdId) ?? [];
      list.push(row);
      map.set(row.externalAdId, list);
    }
    return map;
  }

  private sum(rows: AdDailyRow[], key: keyof AdDailyRow): number {
    return rows.reduce((acc, r) => acc + (r[key] as number), 0);
  }

  private rate(numerator: number, denominator: number): number | null {
    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator <= 0
    ) {
      return null;
    }
    return numerator / denominator;
  }

  private toDateStr(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private subtractDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return this.toDateStr(d);
  }

  private minDate(a: string, b: string): string {
    return a < b ? a : b;
  }

  private maxDate(a: string, b: string): string {
    return a > b ? a : b;
  }
}
