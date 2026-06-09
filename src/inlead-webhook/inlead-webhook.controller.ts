import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InleadActiveCampaignWebhookDto } from './dto/inlead-activecampaign-webhook.dto';
import { InleadWebhookService } from './inlead-webhook.service';

@ApiTags('Inlead Webhook')
@Controller('webhooks/inlead')
export class InleadWebhookController {
  constructor(private readonly inleadWebhook: InleadWebhookService) {}

  @Post('activecampaign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recebe payload Inlead e envia contato direto ao ActiveCampaign',
    description:
      'Endpoint desvinculado de /lead-registration/start e /lead-score/start. Transforma o payload externo, aplica launch/season/tag mockados e chama o ActiveCampaign diretamente.',
  })
  @ApiBody({ type: InleadActiveCampaignWebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Contato enviado para o ActiveCampaign',
  })
  async sendToActiveCampaign(
    @Body() payload: InleadActiveCampaignWebhookDto,
    @Headers() headers: Record<string, any>,
  ) {
    return await this.inleadWebhook.sendToActiveCampaign(payload, headers);
  }
}
