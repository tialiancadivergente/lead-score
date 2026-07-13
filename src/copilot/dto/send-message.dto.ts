import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Por que o anúncio X piorou nos últimos 3 dias?' })
  content!: string;
}
