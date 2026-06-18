import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@alianca.com' })
  email!: string;

  @ApiProperty({ example: 'Admin@2026!' })
  password!: string;
}
