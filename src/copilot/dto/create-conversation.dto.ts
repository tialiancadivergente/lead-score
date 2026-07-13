import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ example: '12345678-0000-0000-0000-000000000001' })
  launchId!: string;

  @ApiProperty({ required: false, example: 'Por que o CPL subiu essa semana?' })
  title?: string;
}
