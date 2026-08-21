import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class ManualOverrideDto {
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
