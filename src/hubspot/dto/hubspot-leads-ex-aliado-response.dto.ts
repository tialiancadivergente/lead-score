import { ApiProperty } from '@nestjs/swagger';
import {
  HubspotLeadDto,
  HubspotLeadsMetaDto,
} from './hubspot-leads-response.dto';

export class HubspotLeadExAliadoDto extends HubspotLeadDto {
  @ApiProperty({
    description:
      'Existe pedido com status 2 ou 241 para cliente com o mesmo email (sem diferenca de caixa ou espacos nas pontas).',
    example: true,
  })
  ex_aliado!: boolean;
}

export class HubspotLeadsExAliadoResponseDto {
  @ApiProperty({ type: [HubspotLeadExAliadoDto] })
  items!: HubspotLeadExAliadoDto[];

  @ApiProperty({ type: HubspotLeadsMetaDto })
  meta!: HubspotLeadsMetaDto;
}
