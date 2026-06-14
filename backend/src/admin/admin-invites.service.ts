import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInviteDto } from "./dto/admin-invite.dto";

/**
 * 管理端邀请码服务。
 * 功能：英雄帖列表、创建、作废与状态查询。
 * 参数：邀请码 id 与创建参数。
 * 返回值：邀请码摘要。
 */
@Injectable()
export class AdminInvitesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 列出全部邀请码。
   * 功能：按创建时间倒序返回，附带使用人信息。
   * 参数：无。
   * 返回值：邀请码数组。
   */
  async listInvites() {
    const invites = await this.prisma.heroInvite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        usedBy: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    const now = Date.now();
    return invites.map((invite) => ({
      id: invite.id.toString(),
      code: invite.code,
      note: invite.note,
      usedAt: invite.usedAt,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      usedBy: invite.usedBy
        ? {
            id: invite.usedBy.id.toString(),
            email: invite.usedBy.email,
            displayName: invite.usedBy.displayName,
          }
        : null,
      status: this.resolveInviteStatus(invite.usedAt, invite.expiresAt, now),
    }));
  }

  /**
   * 创建邀请码。
   * 功能：生成唯一英雄帖代码，可附备注与过期时间。
   * 参数：dto - 创建参数。
   * 返回值：新邀请码摘要。
   */
  async createInvite(dto: CreateInviteDto) {
    const code = this.generateInviteCode();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const invite = await this.prisma.heroInvite.create({
      data: {
        code,
        note: dto.note,
        expiresAt,
      },
    });

    return {
      id: invite.id.toString(),
      code: invite.code,
      note: invite.note,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      status: "unused",
    };
  }

  /**
   * 作废未使用的邀请码。
   * 功能：将过期时间设为当前时刻，使邀请码立即失效。
   * 参数：inviteId - 邀请码 id。
   * 返回值：作废后的邀请码摘要。
   */
  async revokeInvite(inviteId: bigint) {
    const invite = await this.prisma.heroInvite.findUnique({ where: { id: inviteId } });
    if (!invite) {
      throw new NotFoundException("邀请码不存在");
    }
    if (invite.usedAt) {
      throw new BadRequestException("邀请码已被使用，无法作废");
    }

    const updated = await this.prisma.heroInvite.update({
      where: { id: inviteId },
      data: { expiresAt: new Date() },
    });

    return {
      id: updated.id.toString(),
      code: updated.code,
      expiresAt: updated.expiresAt,
      status: "revoked",
    };
  }

  /**
   * 生成唯一邀请码字符串。
   * 功能：使用随机字节生成 YINGXIONG- 前缀代码。
   * 参数：无。
   * 返回值：邀请码明文。
   */
  private generateInviteCode() {
    const suffix = randomBytes(4).toString("hex").toUpperCase();
    return `YINGXIONG-${suffix}`;
  }

  /**
   * 计算邀请码展示状态。
   * 功能：根据使用时间与过期时间判断 unused / used / expired / revoked。
   * 参数：usedAt - 使用时间；expiresAt - 过期时间；nowMs - 当前时间戳。
   * 返回值：状态字符串。
   */
  private resolveInviteStatus(usedAt: Date | null, expiresAt: Date | null, nowMs: number) {
    if (usedAt) {
      return "used";
    }
    if (expiresAt && expiresAt.getTime() <= nowMs) {
      return "expired";
    }
    return "unused";
  }
}
