import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { validateLevelConfig } from "../levels/level-schema.validator";
import { CreateLevelDto, UpdateLevelDto } from "./dto/admin-level.dto";

/**
 * 管理后台服务。
 * 功能：关卡 CRUD、发布、归档。
 * 参数：DTO 和 levelId。
 * 返回值：关卡实体摘要。
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建草稿关卡。
   * 功能：schema 校验通过后写入数据库。
   * 参数：dto - 创建参数。
   * 返回值：关卡摘要。
   */
  async createLevel(dto: CreateLevelDto) {
    const validation = validateLevelConfig({
      initialState: dto.initialState,
      goal: dto.goal,
      constraints: dto.constraints,
    });
    if (!validation.valid) {
      throw new BadRequestException(validation.errors);
    }

    const level = await this.prisma.level.create({
      data: {
        courseId: dto.courseId,
        chapterId: dto.chapterId,
        title: dto.title,
        description: dto.description,
        difficulty: dto.difficulty,
        sortOrder: dto.sortOrder ?? 0,
        initialState: dto.initialState,
        goal: dto.goal,
        constraints: dto.constraints,
        status: "DRAFT",
      },
    });

    return { id: level.id.toString(), status: level.status };
  }

  /**
   * 更新关卡内容。
   * 功能：合并更新字段并重新校验 schema。
   * 参数：levelId - 关卡 id；dto - 更新参数。
   * 返回值：更新后的关卡摘要。
   */
  async updateLevel(levelId: bigint, dto: UpdateLevelDto) {
    const existing = await this.prisma.level.findUnique({ where: { id: levelId } });
    if (!existing) {
      throw new NotFoundException("关卡不存在");
    }

    const merged = {
      initialState: dto.initialState ?? (existing.initialState as Record<string, unknown>),
      goal: dto.goal ?? (existing.goal as Record<string, unknown>),
      constraints: dto.constraints ?? (existing.constraints as Record<string, unknown>),
    };
    const validation = validateLevelConfig(merged);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors);
    }

    const level = await this.prisma.level.update({
      where: { id: levelId },
      data: {
        title: dto.title,
        description: dto.description,
        difficulty: dto.difficulty,
        sortOrder: dto.sortOrder,
        initialState: dto.initialState,
        goal: dto.goal,
        constraints: dto.constraints,
      },
    });

    return { id: level.id.toString(), status: level.status, title: level.title };
  }

  /**
   * 发布关卡。
   * 功能：校验 schema 后将状态改为 PUBLISHED。
   * 参数：levelId - 关卡 id。
   * 返回值：发布后的关卡摘要。
   */
  async publishLevel(levelId: bigint) {
    const existing = await this.prisma.level.findUnique({ where: { id: levelId } });
    if (!existing) {
      throw new NotFoundException("关卡不存在");
    }

    const validation = validateLevelConfig({
      initialState: existing.initialState,
      goal: existing.goal,
      constraints: existing.constraints,
    });
    if (!validation.valid) {
      throw new BadRequestException(validation.errors);
    }

    const level = await this.prisma.level.update({
      where: { id: levelId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    return { id: level.id.toString(), status: level.status, publishedAt: level.publishedAt };
  }

  /**
   * 归档关卡。
   * 功能：将 PUBLISHED 关卡标记为 ARCHIVED。
   * 参数：levelId - 关卡 id。
   * 返回值：归档后的关卡摘要。
   */
  async archiveLevel(levelId: bigint) {
    const existing = await this.prisma.level.findUnique({ where: { id: levelId } });
    if (!existing) {
      throw new NotFoundException("关卡不存在");
    }

    const level = await this.prisma.level.update({
      where: { id: levelId },
      data: { status: "ARCHIVED" },
    });

    return { id: level.id.toString(), status: level.status };
  }
}
