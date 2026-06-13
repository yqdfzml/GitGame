import { IsString, MaxLength, MinLength } from "class-validator";

/** 提交 Git 命令 DTO */
export class SubmitCommandDto {
  /** 用户输入的 git 命令 */
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  command!: string;
}
