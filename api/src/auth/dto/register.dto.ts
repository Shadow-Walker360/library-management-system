import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  // bcrypt only uses the first 72 bytes of a password
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
