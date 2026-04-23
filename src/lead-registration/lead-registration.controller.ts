import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LeadRegistrationService } from './lead-registration.service';
import { ActiveCampaignService } from './services/activecampaign.service';
import { LeadPersistenceService } from './services/lead-persistence.service';
import { LeadRegistrationPayloadDto } from './dto/lead-registration-payload.dto';
import { RequireLeadRegistrationFieldsPipe } from './pipes/require-lead-registration-fields.pipe';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('Lead Registration')
@ApiHeader({
  name: 'x-api-key',
  required: false,
  description:
    'API key interna. Obrigatória quando API_KEY_ENABLED=true no backend.',
})
@UseGuards(ApiKeyGuard)
@Controller('lead-registration')
export class LeadRegistrationController {
  constructor(
    private readonly leadRegistration: LeadRegistrationService,
    private readonly activeCampaign: ActiveCampaignService,
    private readonly persistence: LeadPersistenceService,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Enfileira o cadastro de um lead',
    description:
      'Endpoint “start”: coloca uma mensagem na fila de cadastro de leads. O consumer processa em background.',
  })
  @ApiBody({ type: LeadRegistrationPayloadDto })
  @ApiResponse({
    status: 202,
    description: 'Mensagem enfileirada',
  })
  async start(
    @Body(new RequireLeadRegistrationFieldsPipe())
    dto: LeadRegistrationPayloadDto,
  ) {
    return await this.leadRegistration.enqueueLeadRegistration(dto);
  }

  @Post('activecampaign')
  @ApiOperation({
    summary: 'Cadastra lead no ActiveCampaign (manual)',
    description:
      'Endpoint auxiliar para testes. O consumer chama o serviço diretamente, mas este endpoint permite validar a integração.',
  })
  @ApiBody({ type: LeadRegistrationPayloadDto })
  @ApiResponse({ status: 201, description: 'Contato criado no ActiveCampaign' })
  async registerInActiveCampaign(
    @Body(new RequireLeadRegistrationFieldsPipe())
    dto: LeadRegistrationPayloadDto,
  ) {
    return await this.activeCampaign.createContact(dto);
  }

  @Post('database')
  @ApiOperation({
    summary: 'Cadastra lead no banco (manual)',
    description:
      'Persistência provisória: salva o payload em `capture.metadata` (jsonb). Depois podemos evoluir para um schema de lead.',
  })
  @ApiBody({ type: LeadRegistrationPayloadDto })
  @ApiResponse({ status: 201, description: 'Lead persistido (provisório)' })
  async registerInDatabase(
    @Body(new RequireLeadRegistrationFieldsPipe())
    dto: LeadRegistrationPayloadDto,
  ) {
    return await this.persistence.persistLead(dto);
  }
}
