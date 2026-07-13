import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpsertCopilotConfigDto } from './dto/upsert-copilot-config.dto';
import { UpdateRiskAlertDto } from './dto/update-risk-alert.dto';
import { ListRiskAlertsQueryDto } from './dto/list-risk-alerts-query.dto';
import { CopilotChatService } from './services/copilot-chat.service';
import { CopilotConfigService } from './services/copilot-config.service';
import { CopilotRiskAlertsService } from './services/copilot-risk-alerts.service';

@ApiTags('copilot')
@ApiBearerAuth('bearer')
@UseGuards(ApiKeyGuard, JwtAuthGuard, PermissionGuard)
@RequirePermission('copilot', 'view')
@Controller('copilot')
export class CopilotController {
  constructor(
    private readonly chatService: CopilotChatService,
    private readonly configService: CopilotConfigService,
    private readonly riskAlertsService: CopilotRiskAlertsService,
  ) {}

  // ─── Conversas ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Lista conversas do copiloto para um lançamento' })
  @ApiQuery({ name: 'launchId', required: false })
  @Get('conversations')
  listConversations(@Query('launchId') launchId?: string) {
    return this.chatService.listConversations(launchId);
  }

  @ApiOperation({ summary: 'Cria uma nova conversa com o copiloto' })
  @Post('conversations')
  createConversation(
    @Body() dto: CreateConversationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.chatService.createConversation(
      dto.launchId,
      req.user?.id,
      dto.title,
    );
  }

  @ApiOperation({ summary: 'Histórico de mensagens de uma conversa' })
  @ApiParam({ name: 'id', type: 'string' })
  @Get('conversations/:id/messages')
  listMessages(@Param('id') id: string) {
    return this.chatService.listMessages(id);
  }

  @ApiOperation({
    summary: 'Envia uma mensagem na conversa e retorna a resposta do copiloto',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @Post('conversations/:id/messages')
  sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(id, dto.content);
  }

  // ─── Alertas de risco ─────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Lista alertas de risco detectados' })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @Get('risk-alerts')
  listRiskAlerts(@Query() query: ListRiskAlertsQueryDto) {
    return this.riskAlertsService.list(query.launchId, query.status);
  }

  @ApiOperation({ summary: 'Atualiza o status de um alerta de risco' })
  @ApiParam({ name: 'id', type: 'string' })
  @Patch('risk-alerts/:id')
  @RequirePermission('copilot', 'update')
  updateRiskAlert(@Param('id') id: string, @Body() dto: UpdateRiskAlertDto) {
    return this.riskAlertsService.updateStatus(id, dto.status);
  }

  // ─── Config ───────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Retorna configuração do copiloto para o lançamento',
  })
  @ApiParam({ name: 'launchId', type: 'string' })
  @Get('config/:launchId')
  getConfig(@Param('launchId') launchId: string) {
    return this.configService.getConfig(launchId);
  }

  @ApiOperation({
    summary: 'Cria ou atualiza a configuração do copiloto para o lançamento',
  })
  @ApiParam({ name: 'launchId', type: 'string' })
  @Put('config/:launchId')
  @RequirePermission('copilot', 'update')
  upsertConfig(
    @Param('launchId') launchId: string,
    @Body() dto: UpsertCopilotConfigDto,
  ) {
    return this.configService.upsertConfig(launchId, dto);
  }
}
