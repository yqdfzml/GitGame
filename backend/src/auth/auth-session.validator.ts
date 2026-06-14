import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "./guards/jwt-auth.guard";

/**
 * Access token 会话校验器。
 * 功能：JWT 验签后回查数据库，确保角色、状态与 token 版本仍有效。
 */
@Injectable()
export class AuthSessionValidator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 校验 access token 载荷是否与数据库一致。
   * 功能：禁用、降权、撤销会话后旧 token 立即失效。
   * 参数：payload - JWT 解码结果。
   * 返回值：以数据库为准的最新载荷（含 role、ver）。
   */
  async validateAccessPayload(payload: JwtPayload): Promise<JwtPayload> {
    /** 载荷中的用户 id */
    const userId = BigInt(payload.sub);
    /** 载荷中的 token 版本，旧 token 无此字段时视为 0 */
    const payloadVersion = payload.ver ?? 0;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        status: true,
        tokenVersion: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("账号不可用");
    }

    if (payloadVersion !== user.tokenVersion) {
      throw new UnauthorizedException("登录已失效，请重新登录");
    }

    return {
      sub: user.id.toString(),
      role: user.role,
      type: payload.type,
      ver: user.tokenVersion,
    };
  }
}
