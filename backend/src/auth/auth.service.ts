import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
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

/**
 * 认证服务。
 * 功能：处理注册、登录、登出和 JWT 签发。
 * 参数：通过 DTO 传入邮箱和密码。
 * 返回值：用户摘要和 token 字符串。
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
   * 功能：校验邮箱唯一性，bcrypt 哈希密码并创建用户。
   * 参数：dto - 注册信息。
   * 返回值：AuthUserSummary。
   */
  async register(dto: RegisterDto): Promise<AuthUserSummary> {
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

    return {
      id: user.id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }

  /**
   * 用户登录。
   * 功能：校验密码并更新 lastLoginAt。
   * 参数：dto - 登录信息。
   * 返回值：用户摘要和 JWT token。
   */
  async login(dto: LoginDto): Promise<{ user: AuthUserSummary; token: string }> {
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

    const summary: AuthUserSummary = {
      id: user.id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    const token = await this.signToken(summary);
    return { user: summary, token };
  }

  /**
   * 签发 JWT。
   * 功能：将用户 id 和 role 写入 token。
   * 参数：user - 用户摘要。
   * 返回值：JWT 字符串。
   */
  async signToken(user: AuthUserSummary): Promise<string> {
    const expiresIn = Number(this.config.get<string>("JWT_EXPIRES_IN"));
    return this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn },
    );
  }
}
