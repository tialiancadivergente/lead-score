import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CopilotRiskAlert,
  CopilotRiskAlertStatus,
} from '../../database/entities/copilot/copilot-risk-alert.entity';

export type CreateRiskAlertInput = {
  launchId: string;
  externalAdId?: string | null;
  adName?: string | null;
  ruleKey: string;
  detectedOn: string;
  severity: CopilotRiskAlert['severity'];
  title: string;
  narrative?: string | null;
  recommendation?: string | null;
  currentValue?: number | null;
  baselineValue?: number | null;
  pctDiff?: number | null;
};

@Injectable()
export class CopilotRiskAlertsService {
  constructor(
    @InjectRepository(CopilotRiskAlert)
    private readonly alertRepo: Repository<CopilotRiskAlert>,
  ) {}

  async list(launchId?: string, status?: CopilotRiskAlertStatus) {
    const where: Partial<Pick<CopilotRiskAlert, 'launch_id' | 'status'>> = {};
    if (launchId) where.launch_id = launchId;
    if (status) where.status = status;

    return this.alertRepo.find({
      where,
      order: { detected_on: 'DESC', created_at: 'DESC' },
    });
  }

  async updateStatus(id: string, status: CopilotRiskAlertStatus) {
    await this.alertRepo.update({ id }, { status });
    return this.alertRepo.findOne({ where: { id } });
  }

  // Dedupe por (launch, ad, rule, dia) via UNIQUE INDEX na migration —
  // ON CONFLICT DO NOTHING evita recriar o mesmo alerta em cada ciclo do scan.
  async createIfNotExists(input: CreateRiskAlertInput): Promise<boolean> {
    const result = await this.alertRepo
      .createQueryBuilder()
      .insert()
      .into(CopilotRiskAlert)
      .values({
        launch_id: input.launchId,
        external_ad_id: input.externalAdId ?? null,
        ad_name: input.adName ?? null,
        rule_key: input.ruleKey,
        detected_on: input.detectedOn,
        severity: input.severity,
        title: input.title,
        narrative: input.narrative ?? null,
        recommendation: input.recommendation ?? null,
        current_value: input.currentValue ?? null,
        baseline_value: input.baselineValue ?? null,
        pct_diff: input.pctDiff ?? null,
        status: 'open',
      })
      .orIgnore()
      .execute();

    return (result.raw as unknown[])?.length > 0;
  }
}
