import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CopilotConfig } from '../../database/entities/copilot/copilot-config.entity';
import { UpsertCopilotConfigDto } from '../dto/upsert-copilot-config.dto';

@Injectable()
export class CopilotConfigService {
  constructor(
    @InjectRepository(CopilotConfig)
    private readonly configRepo: Repository<CopilotConfig>,
  ) {}

  async getConfig(launchId: string): Promise<CopilotConfig | null> {
    return this.configRepo.findOne({ where: { launch_id: launchId } });
  }

  async upsertConfig(
    launchId: string,
    dto: UpsertCopilotConfigDto,
  ): Promise<CopilotConfig> {
    let config = await this.configRepo.findOne({
      where: { launch_id: launchId },
    });
    if (!config) {
      config = this.configRepo.create({ launch_id: launchId });
    }

    if (dto.riskSensitivity !== undefined) {
      config.risk_sensitivity = dto.riskSensitivity;
    }
    if (dto.enabledRules !== undefined) {
      config.enabled_rules =
        dto.enabledRules && dto.enabledRules.length > 0
          ? dto.enabledRules.join(',')
          : null;
    }
    if (dto.extraContext !== undefined) {
      config.extra_context = dto.extraContext;
    }

    return this.configRepo.save(config);
  }

  isRuleEnabled(config: CopilotConfig | null, ruleKey: string): boolean {
    if (!config?.enabled_rules) return true;
    return config.enabled_rules.split(',').includes(ruleKey);
  }

  getSensitivityMultiplier(config: CopilotConfig | null): number {
    switch (config?.risk_sensitivity) {
      case 'low':
        return 1.5;
      case 'high':
        return 0.6;
      default:
        return 1;
    }
  }
}
