import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

/** 创建邀请码 DTO */
export class CreateInviteDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  note?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
