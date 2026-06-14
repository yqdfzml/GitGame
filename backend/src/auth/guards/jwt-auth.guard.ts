import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { AuthSessionValidator } from "../auth-session.validator";

/** JWT 载荷结构 */
export interface JwtPayload {
  /** 用户 id 字符串 */
  sub: string;
  /** 用户角色 */
  role: string;
  /** 令牌类型，access 用于接口鉴权 */
  type?: string;
  /** token 版本，与 users.token_version 对齐 */
  ver?: number;
}

/** 带 user 字段的请求类型 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * JWT 鉴权守卫。
 * 功能：从 httpOnly Cookie 解析 JWT，回查数据库校验会话有效性。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authSessionValidator: AuthSessionValidator,
  ) {}

  /**
   * 校验请求 Cookie 中的 access_token。
   * 功能：验签后回查用户 status/role/tokenVersion。
   * 参数：context - 执行上下文。
   * 返回值：Promise<boolean>。
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.access_token as string | undefined;
    if (!token) {
      throw new UnauthorizedException("未登录");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.type && payload.type !== "access") {
        throw new UnauthorizedException("无效的访问令牌");
      }
      request.user = await this.authSessionValidator.validateAccessPayload(payload);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("登录已过期");
    }
  }
}
