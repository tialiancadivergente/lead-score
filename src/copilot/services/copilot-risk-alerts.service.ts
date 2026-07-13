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

  // Checa a mesma chave de dedupe do UNIQUE INDEX (launch, ad, rule, dia) ANTES
  // de gerar a narrativa via LLM — o motor de risco deve chamar isso primeiro e
  // só acionar a LLM quando retornar false, senão um sinal que continua ativo
  // gera uma chamada de LLM por ciclo de scan (ex: 24x/dia com interval de 1h)
  // mesmo que o INSERT seguinte fosse um no-op.
  async exists(
    launchId: string,
    externalAdId: string | null,
    ruleKey: string,
    detectedOn: string,
  ): Promise<boolean> {
    const count = await this.alertRepo
      .createQueryBuilder('a')
      .where('a.launch_id = :launchId', { launchId })
      .andWhere(
        externalAdId === null
          ? 'a.external_ad_id IS NULL'
          : 'a.external_ad_id = :externalAdId',
        externalAdId === null ? {} : { externalAdId },
      )
      .andWhere('a.rule_key = :ruleKey', { ruleKey })
      .andWhere('a.detected_on = :detectedOn', { detectedOn })
      .getCount();
    return count > 0;
  }

  // Dedupe por (launch, ad, rule, dia) via UNIQUE INDEX na migration —
  // ON CONFLICT DO NOTHING é a garantia final contra corrida entre scans
  // concorrentes; o caminho normal é `exists()` evitar chegar aqui de novo.
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
