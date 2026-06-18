import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ minLength: 8 })
  password!: string;

  @ApiProperty({ type: [String], required: false })
  roleIds?: string[];
}
