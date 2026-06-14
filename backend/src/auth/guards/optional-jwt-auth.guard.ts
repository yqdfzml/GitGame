import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthRequest, JwtPayload } from "./jwt-auth.guard";

/**
 * 可选 JWT 鉴权守卫。
 * 功能：有有效 token 时注入 request.user，未登录时不拦截。
 * 参数：通过 NestJS 守卫机制自动注入。
 * 返回值：始终 true。
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * 尝试解析 Cookie 中的 access_token。
   * 功能：解析成功则写入 request.user，失败则保持 undefined。
   * 参数：context - 执行上下文。
   * 返回值：Promise<boolean>，恒为 true。
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.access_token as string | undefined;
    if (!token) {
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.type && payload.type !== "access") {
        return true;
      }
      request.user = payload;
    } catch {
      // 可选鉴权：token 无效时按未登录处理
    }

    return true;
  }
}
