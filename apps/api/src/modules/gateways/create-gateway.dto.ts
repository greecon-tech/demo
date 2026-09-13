import { IsNotEmpty, IsString } from "class-validator";

export class CreateGatewayDto {
  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
