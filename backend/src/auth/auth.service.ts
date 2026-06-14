import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { AvatarStorageService } from "./avatar-storage.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";

/** 认证成功返回的用户摘要 */
export interface AuthUserSummary {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

/** 登录会话：访问令牌 + 刷新令牌 */
export interface AuthSessionTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * 认证服务。
 * 功能：处理注册、登录、双 token 会话与刷新轮换。
 * 参数：通过 DTO 或 token 字符串传入。
 * 返回值：用户摘要与会话令牌。
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly avatarStorage: AvatarStorageService,
  ) {}

  /**
   * 用户注册。
   * 功能：校验英雄帖与邮箱唯一性，保存头像并创建用户。
   * 参数：dto - 注册信息；avatarFile - 裁剪后的头像文件。
   * 返回值：用户摘要与会话令牌。
   */
  async register(
    dto: RegisterDto,
    avatarFile: Express.Multer.File,
  ): Promise<{ user: AuthUserSummary; tokens: AuthSessionTokens }> {
    const inviteCode = dto.heroInviteCode.trim();
    const invite = await this.prisma.heroInvite.findUnique({ where: { code: inviteCode } });
    if (!invite) {
      throw new BadRequestException("英雄帖无效");
    }
    if (invite.usedAt) {
      throw new BadRequestException("英雄帖已被使用");
    }
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("英雄帖已过期");
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("邮箱已被注册");
    }

    const avatarUrl = await this.avatarStorage.saveAvatar(avatarFile);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          avatarUrl,
        },
      });

      await tx.heroInvite.update({
        where: { id: invite.id },
        data: {
          usedById: created.id,
          usedAt: new Date(),
        },
      });

      return created;
    });

    const summary = this.toUserSummary(user);
    const tokens = await this.createSession(user.id);
    return { user: summary, tokens };
  }

  /**
   * 用户登录。
   * 功能：校验密码并签发新的双 token 会话。
   * 参数：dto - 登录信息。
   * 返回值：用户摘要与会话令牌。
   */
  async login(dto: LoginDto): Promise<{ user: AuthUserSummary; tokens: AuthSessionTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("邮箱或密码错误");
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException("邮箱或密码错误");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const summary = this.toUserSummary(user);
    const tokens = await this.createSession(user.id);
    return { user: summary, tokens };
  }

  /**
   * 刷新访问令牌。
   * 功能：校验 refresh token 并轮换为新的一对 token。
   * 参数：rawRefreshToken - Cookie 中的刷新令牌明文。
   * 返回值：用户摘要与新会话令牌。
   */
  async refreshSession(rawRefreshToken: string): Promise<{ user: AuthUserSummary; tokens: AuthSessionTokens }> {
    const tokenHash = this.hashToken(rawRefreshToken);

    return this.prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findFirst({
        where: {
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!stored) {
        throw new UnauthorizedException("登录已过期，请重新登录");
      }

      const user = await tx.user.findUnique({ where: { id: stored.userId } });
      if (!user || user.status !== "ACTIVE") {
        throw new UnauthorizedException("账号不可用");
      }

      // 条件撤销：并发 refresh 只有一个请求能成功，防止 token 重放
      const revokeResult = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revokeResult.count !== 1) {
        throw new UnauthorizedException("登录已过期，请重新登录");
      }

      const summary = this.toUserSummary(user);
      const tokens = await this.createSessionInTransaction(tx, user.id, user.tokenVersion);
      return { user: summary, tokens };
    });
  }

  /**
   * 使用户全部会话失效。
   * 功能：递增 tokenVersion 并撤销 refresh token，旧 access token 立即不可用。
   * 参数：userId - 目标用户 id。
   * 返回值：无。
   */
  async invalidateUserSessions(userId: bigint): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });
      const revokeResult = await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return revokeResult.count;
    });
  }

  /**
   * 撤销单个 refresh token。
   * 功能：登出时作废当前设备的刷新令牌。
   * 参数：rawRefreshToken - 刷新令牌明文。
   * 返回值：无。
   */
  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * 按用户 id 查询完整资料。
   * 功能：供 /auth/me 返回可持久化的用户信息。
   * 参数：userId - 用户主键。
   * 返回值：用户摘要。
   */
  async getProfile(userId: bigint): Promise<AuthUserSummary> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("用户不存在或已禁用");
    }
    return this.toUserSummary(user);
  }

  /**
   * 创建新的双 token 会话。
   * 功能：签发 access JWT 并将 refresh 哈希入库。
   * 参数：userId - 用户主键。
   * 返回值：access 与 refresh 明文令牌。
   */
  private async createSession(userId: bigint): Promise<AuthSessionTokens> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }
    return this.createSessionInTransaction(this.prisma, userId, user.tokenVersion);
  }

  /**
   * 在事务内创建双 token 会话。
   * 功能：签发 access JWT 并将 refresh 哈希入库。
   * 参数：tx - Prisma 客户端或事务；userId - 用户 id；tokenVersion - 写入 JWT 的版本号。
   * 返回值：access 与 refresh 明文令牌。
   */
  private async createSessionInTransaction(
    tx: Prisma.TransactionClient | PrismaService,
    userId: bigint,
    tokenVersion: number,
  ): Promise<AuthSessionTokens> {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }

    const summary = this.toUserSummary(user);
    const accessToken = await this.signAccessToken(summary, tokenVersion);
    const refreshToken = this.generateRefreshToken();
    const refreshExpiresIn = Number(this.config.get<string>("JWT_REFRESH_EXPIRES_IN"));
    const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

    await tx.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * 签发短期 access JWT。
   * 功能：写入用户 id、角色与 token 类型。
   * 参数：user - 用户摘要。
   * 返回值：JWT 字符串。
   */
  private signAccessToken(user: AuthUserSummary, tokenVersion: number): Promise<string> {
    const expiresIn = Number(this.config.get<string>("JWT_EXPIRES_IN"));
    return this.jwtService.signAsync(
      { sub: user.id, role: user.role, type: "access", ver: tokenVersion },
      { expiresIn },
    );
  }

  /**
   * 生成随机 refresh token 明文。
   * 功能：用于 Cookie 传递，数据库只存哈希。
   * 参数：无。
   * 返回值：64 位十六进制字符串。
   */
  private generateRefreshToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * 对 refresh token 做 SHA-256 哈希。
   * 功能：避免明文入库。
   * 参数：token - 刷新令牌明文。
   * 返回值：十六进制哈希。
   */
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * 将数据库用户转为 API 摘要。
   * 功能：统一字段格式。
   * 参数：user - Prisma User 实体。
   * 返回值：AuthUserSummary。
   */
  private toUserSummary(user: {
    id: bigint;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
  }): AuthUserSummary {
    return {
      id: user.id.toString(),
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }
}
