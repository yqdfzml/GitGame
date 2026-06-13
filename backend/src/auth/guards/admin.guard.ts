import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthRequest } from "./jwt-auth.guard";

/**
 * 管理员角色守卫。
 * 功能：要求 request.user.role 为 ADMIN。
 * 参数：通过 NestJS 守卫机制自动注入。
 * 返回值：boolean。
 */
@Injectable()
export class AdminGuard implements CanActivate {
  /**
   * 检查当前用户是否为管理员。
   * 功能：非 ADMIN 角色抛出 403。
   * 参数：context - 执行上下文。
   * 返回值：boolean。
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (request.user?.role !== "ADMIN") {
      throw new ForbiddenException("需要管理员权限");
    }
    return true;
  }
}
