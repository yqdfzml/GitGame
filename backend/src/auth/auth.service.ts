import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";

/** 认证成功返回的用户摘要 */
export interface AuthUserSummary {
  id: string;
  email: string;
  displayName: string;
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
  ) {}

  /**
   * 用户注册。
   * 功能：校验邮箱唯一性，创建用户并建立登录会话。
   * 参数：dto - 注册信息。
   * 返回值：用户摘要与会话令牌。
   */
  async register(dto: RegisterDto): Promise<{ user: AuthUserSummary; tokens: AuthSessionTokens }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("邮箱已被注册");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
      },
    });

    const summary = this.toUserSummary(user);
    const tokens = await this.createSession(BigInt(summary.id));
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
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!stored) {
      throw new UnauthorizedException("登录已过期，请重新登录");
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("账号不可用");
    }

    // 轮换：旧 refresh 立即作废，防止重复使用
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const summary = this.toUserSummary(user);
    const tokens = await this.createSession(user.id);
    return { user: summary, tokens };
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

    const summary = this.toUserSummary(user);
    const accessToken = await this.signAccessToken(summary);
    const refreshToken = this.generateRefreshToken();
    const refreshExpiresIn = Number(this.config.get<string>("JWT_REFRESH_EXPIRES_IN"));
    const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

    await this.prisma.refreshToken.create({
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
  private signAccessToken(user: AuthUserSummary): Promise<string> {
    const expiresIn = Number(this.config.get<string>("JWT_EXPIRES_IN"));
    return this.jwtService.signAsync(
      { sub: user.id, role: user.role, type: "access" },
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
    role: string;
  }): AuthUserSummary {
    return {
      id: user.id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }
}
