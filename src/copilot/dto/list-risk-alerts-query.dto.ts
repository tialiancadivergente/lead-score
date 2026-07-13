import { ApiPropertyOptional } from '@nestjs/swagger';
import type { CopilotRiskAlertStatus } from '../../database/entities/copilot/copilot-risk-alert.entity';

export class ListRiskAlertsQueryDto {
  @ApiPropertyOptional({ example: '12345678-0000-0000-0000-000000000001' })
  launchId?: string;

  @ApiPropertyOptional({
    enum: ['open', 'acknowledged', 'resolved', 'dismissed_false_positive'],
    example: 'open',
  })
  status?: CopilotRiskAlertStatus;
}
