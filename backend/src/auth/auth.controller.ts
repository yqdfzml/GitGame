import { Body, Controller, Post, Res, UseGuards, Req } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { AuthRequest, JwtAuthGuard } from "./guards/jwt-auth.guard";

/**
 * 认证控制器。
 * 功能：提供注册、登录、登出 HTTP 接口。
 * 参数：通过 DTO 和 Cookie 传递。
 * 返回值：JSON 响应并设置 httpOnly Cookie。
 */
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 用户注册。
   * 功能：创建账号并自动登录。
   * 参数：dto - RegisterDto；res - Express Response。
   * 返回值：用户摘要 JSON。
   */
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.register(dto);
    const token = await this.authService.signToken(user);
    this.setAuthCookie(res, token);
    return { user };
  }

  /**
   * 用户登录。
   * 功能：校验凭证并写入 Cookie。
   * 参数：dto - LoginDto；res - Express Response。
   * 返回值：用户摘要 JSON。
   */
  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.authService.login(dto);
    this.setAuthCookie(res, token);
    return { user };
  }

  /**
   * 用户登出。
   * 功能：清除 httpOnly Cookie。
   * 参数：res - Express Response。
   * 返回值：成功消息。
   */
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("access_token", this.cookieOptions());
    return { message: "已登出" };
  }

  /**
   * 获取当前登录用户。
   * 功能：从 JWT 解析用户信息（需前端额外查库时可扩展）。
   * 参数：req - 带 user 的请求。
   * 返回值：JWT payload。
   */
  @Post("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthRequest) {
    return { user: req.user };
  }

  /** 设置 httpOnly 认证 Cookie */
  private setAuthCookie(res: Response, token: string) {
    res.cookie("access_token", token, this.cookieOptions());
  }

  /** Cookie 配置项 */
  private cookieOptions() {
    const secure = this.config.get<string>("COOKIE_SECURE") === "true";
    const expiresIn = Number(this.config.get<string>("JWT_EXPIRES_IN"));
    return {
      httpOnly: true,
      secure,
      sameSite: "lax" as const,
      maxAge: expiresIn * 1000,
      path: "/",
    };
  }
}
