import { IsEmail, IsIn, IsNotEmpty, IsString } from "class-validator";
import { userRoles } from "@greecon/shared";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsIn(userRoles)
  role!: (typeof userRoles)[number];
}
