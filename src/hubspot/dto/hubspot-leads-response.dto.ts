import { ApiProperty } from '@nestjs/swagger';

export class HubspotLeadDto {
  @ApiProperty({ example: '123456' })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, nullable: true })
  firstname!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastname!: string | null;

  @ApiProperty({ type: String, nullable: true })
  email!: string | null;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ type: String, nullable: true })
  mobilephone!: string | null;

  @ApiProperty({ type: String, nullable: true })
  company!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lifecyclestage!: string | null;

  @ApiProperty({ type: String, nullable: true })
  hs_lead_status!: string | null;

  @ApiProperty({ type: String, nullable: true })
  hubspot_owner_id!: string | null;

  @ApiProperty({ type: String, nullable: true })
  hs_analytics_source!: string | null;

  @ApiProperty({ type: String, nullable: true })
  created_at!: string | null;

  @ApiProperty({ type: String, nullable: true })
  updated_at!: string | null;
}

export class HubspotLeadsMetaDto {
  @ApiProperty({
    description: 'Contatos que correspondem aos filtros no HubSpot.',
  })
  total_items!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty({ type: String, nullable: true, example: '50' })
  next_after!: string | null;

  @ApiProperty()
  has_more!: boolean;

  @ApiProperty({
    description:
      'Ha mais de 10.000 resultados. Restrinja o periodo/filtros para acessar todos.',
  })
  results_limited!: boolean;
}

export class HubspotLeadsResponseDto {
  @ApiProperty({ type: [HubspotLeadDto] })
  items!: HubspotLeadDto[];

  @ApiProperty({ type: HubspotLeadsMetaDto })
  meta!: HubspotLeadsMetaDto;
}
