import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

/** JWT 载荷结构 */
export interface JwtPayload {
  /** 用户 id 字符串 */
  sub: string;
  /** 用户角色 */
  role: string;
}

/** 带 user 字段的请求类型 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * JWT 鉴权守卫。
 * 功能：从 httpOnly Cookie 解析 JWT 并注入 request.user。
 * 参数：通过 NestJS 守卫机制自动注入。
 * 返回值：boolean，鉴权通过返回 true。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * 校验请求 Cookie 中的 access_token。
   * 功能：解析 JWT 并写入 request.user。
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
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("登录已过期");
    }
  }
}
