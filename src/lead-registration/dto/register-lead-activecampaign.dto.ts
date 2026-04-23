import { ApiProperty } from '@nestjs/swagger';
import { LeadRegistrationPayloadDto } from './lead-registration-payload.dto';

export class RegisterLeadActiveCampaignDto {
  @ApiProperty({
    description:
      'Payload do lead para ActiveCampaign. Campos obrigatórios: email e telefone.',
    type: LeadRegistrationPayloadDto,
    example: {
      email: 'teste@gmail.com',
      telefone: '+5554999889988',
    },
  })
  payload!: LeadRegistrationPayloadDto;
}
