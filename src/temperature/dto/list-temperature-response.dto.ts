import { ApiProperty } from '@nestjs/swagger';

export class ListTemperatureItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  abbreviation!: string | null;
}
