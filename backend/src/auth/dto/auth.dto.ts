import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

/** 注册请求 DTO */
export class RegisterDto {
  /** 用户邮箱 */
  @IsEmail()
  email!: string;

  /** 登录密码，6~64 字符 */
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string;

  /** 显示昵称 */
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  displayName!: string;
}

/** 登录请求 DTO */
export class LoginDto {
  /** 用户邮箱 */
  @IsEmail()
  email!: string;

  /** 登录密码 */
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string;
}
