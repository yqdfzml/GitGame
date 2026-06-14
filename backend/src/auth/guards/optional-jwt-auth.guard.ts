import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthSessionValidator } from "../auth-session.validator";
import { AuthRequest, JwtPayload } from "./jwt-auth.guard";

/**
 * 可选 JWT 鉴权守卫。
 * 功能：有有效 token 时注入 request.user，无效或会话失效时按未登录处理。
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authSessionValidator: AuthSessionValidator,
  ) {}

  /**
   * 尝试解析 Cookie 中的 access_token。
   * 功能：验签并回查数据库，失败时不拦截请求。
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
      request.user = await this.authSessionValidator.validateAccessPayload(payload);
    } catch {
      // 可选鉴权：token 无效或会话已失效时按未登录处理
    }

    return true;
  }
}
