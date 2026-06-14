import { IsEmail, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/** 管理员赠送积分 DTO */
export class GrantPointsDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  amount!: number;
}
