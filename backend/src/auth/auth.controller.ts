import { Body, Controller, Post, Res, UseGuards, Req, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { AuthRequest, JwtAuthGuard } from "./guards/jwt-auth.guard";

/**
 * 认证控制器。
 * 功能：注册、登录、刷新、登出与当前用户查询。
 * 参数：通过 DTO 与 Cookie 传递。
 * 返回值：JSON 并设置 httpOnly 双 token Cookie。
 */
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 用户注册。
   * 功能：创建账号并写入双 token Cookie。
   * 参数：dto - RegisterDto；res - Express Response。
   * 返回值：用户摘要 JSON。
   */
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.register(dto);
    this.setAuthCookies(res, tokens);
    return { user };
  }

  /**
   * 用户登录。
   * 功能：校验凭证并写入双 token Cookie。
   * 参数：dto - LoginDto；res - Express Response。
   * 返回值：用户摘要 JSON。
   */
  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.login(dto);
    this.setAuthCookies(res, tokens);
    return { user };
  }

  /**
   * 刷新访问令牌。
   * 功能：用 refresh token 轮换新的双 token。
   * 参数：req - 携带 refresh_token Cookie；res - Express Response。
   * 返回值：用户摘要 JSON。
   */
  @Post("refresh")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.refresh_token as string | undefined;
    if (!rawRefreshToken) {
      throw new UnauthorizedException("未登录");
    }
    const { user, tokens } = await this.authService.refreshSession(rawRefreshToken);
    this.setAuthCookies(res, tokens);
    return { user };
  }

  /**
   * 用户登出。
   * 功能：撤销 refresh token 并清除 Cookie。
   * 参数：req - 请求；res - Express Response。
   * 返回值：成功消息。
   */
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.refresh_token as string | undefined;
    if (rawRefreshToken) {
      await this.authService.revokeRefreshToken(rawRefreshToken);
    }
    this.clearAuthCookies(res);
    return { message: "已登出" };
  }

  /**
   * 获取当前登录用户。
   * 功能：从 access token 解析用户并返回完整资料。
   * 参数：req - 鉴权请求。
   * 返回值：用户摘要 JSON。
   */
  @Post("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthRequest) {
    const userId = BigInt(req.user!.sub);
    const user = await this.authService.getProfile(userId);
    return { user };
  }

  /**
   * 写入 access 与 refresh 双 Cookie。
   * 功能：登录、注册、刷新后统一设置。
   * 参数：res - 响应；tokens - 令牌对。
   * 返回值：无。
   */
  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    res.cookie("access_token", tokens.accessToken, this.accessCookieOptions());
    res.cookie("refresh_token", tokens.refreshToken, this.refreshCookieOptions());
  }

  /**
   * 清除双 token Cookie。
   * 功能：登出时移除浏览器凭证。
   * 参数：res - 响应。
   * 返回值：无。
   */
  private clearAuthCookies(res: Response) {
    res.clearCookie("access_token", this.accessCookieOptions());
    res.clearCookie("refresh_token", this.refreshCookieOptions());
  }

  /** access token Cookie 配置 */
  private accessCookieOptions() {
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

  /** refresh token Cookie 配置，有效期更长用于持久登录 */
  private refreshCookieOptions() {
    const secure = this.config.get<string>("COOKIE_SECURE") === "true";
    const expiresIn = Number(this.config.get<string>("JWT_REFRESH_EXPIRES_IN"));
    return {
      httpOnly: true,
      secure,
      sameSite: "lax" as const,
      maxAge: expiresIn * 1000,
      path: "/",
    };
  }
}
