import { IsString, MaxLength, MinLength } from "class-validator";

/** 解决冲突文件 DTO */
export class ResolveConflictDto {
  /** 冲突文件路径 */
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  path!: string;

  /** 解决后的文件全文 */
  @IsString()
  @MaxLength(8192)
  content!: string;
}
