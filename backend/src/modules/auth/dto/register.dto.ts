import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'usuario@finanzas.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Usuario123!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'Nombre Apellido' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}
