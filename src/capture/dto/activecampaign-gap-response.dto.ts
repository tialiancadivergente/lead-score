import { ApiProperty } from '@nestjs/swagger';

export class ActiveCampaignGapResponseDto {
  @ApiProperty({ example: '120246' })
  tag_id!: string;

  @ApiProperty({ nullable: true, example: '2026-07-01T00:00:00.000Z' })
  start_date!: string | null;

  @ApiProperty({ nullable: true, example: '2026-07-25T23:59:59.999Z' })
  end_date!: string | null;

  @ApiProperty({ example: 1000 })
  total_leads!: number;

  @ApiProperty({
    description:
      'Leads com ID de contato do ActiveCampaign, considerando coluna ou metadata legado.',
    example: 940,
  })
  leads_with_activecampaign_contact!: number;

  @ApiProperty({
    description:
      'Leads sem ID de contato do ActiveCampaign na coluna e no metadata legado.',
    example: 60,
  })
  leads_without_activecampaign_contact!: number;

  @ApiProperty({
    description: 'Leads com activecampaign_contact_id preenchido na coluna.',
    example: 930,
  })
  leads_with_activecampaign_contact_id_column!: number;

  @ApiProperty({
    description:
      'Leads com contact.id no metadata, mas sem activecampaign_contact_id na coluna.',
    example: 10,
  })
  leads_missing_column_but_with_metadata_contact!: number;
}
