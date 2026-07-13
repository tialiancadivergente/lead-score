import { ApiProperty } from '@nestjs/swagger';
import type { CopilotRiskAlertStatus } from '../../database/entities/copilot/copilot-risk-alert.entity';

export class UpdateRiskAlertDto {
  @ApiProperty({
    enum: ['open', 'acknowledged', 'resolved', 'dismissed_false_positive'],
    example: 'acknowledged',
  })
  status!: CopilotRiskAlertStatus;
}
