import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @IsEmail()
  ownerEmail!: string;
}
