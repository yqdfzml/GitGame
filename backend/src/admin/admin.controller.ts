import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminService } from "./admin.service";
import { Difficulty, LevelStatus } from "@prisma/client";
import { CreateLevelDto, SortLevelDto, UpdateLevelDto } from "./dto/admin-level.dto";

/** 管理后台控制器 */
@Controller("admin/levels")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 列出全部关卡。
   * 功能：供管理后台列表与多维筛选使用。
   * 参数：chapterId、status、difficulty、search - 可选筛选。
   * 返回值：关卡摘要数组。
   */
  @Get()
  listLevels(
    @Query("chapterId") chapterId?: string,
    @Query("status") status?: LevelStatus,
    @Query("difficulty") difficulty?: Difficulty,
    @Query("search") search?: string,
  ) {
    return this.adminService.listLevels({ chapterId, status, difficulty, search });
  }

  /**
   * 获取关卡编辑详情。
   * 功能：返回完整配置供表单与预览使用。
   * 参数：id - 关卡 id。
   * 返回值：关卡详情。
   */
  @Get(":id")
  getLevel(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.getLevel(BigInt(id));
  }

  /**
   * 创建草稿关卡。
   * 功能：校验 JSON schema 后写入 DRAFT 状态。
   * 参数：dto - CreateLevelDto。
   * 返回值：新关卡摘要。
   */
  @Post()
  createLevel(@Body() dto: CreateLevelDto) {
    return this.adminService.createLevel(dto);
  }

  /**
   * 更新关卡。
   * 功能：编辑草稿或已发布关卡内容。
   * 参数：id - 关卡 id；dto - UpdateLevelDto。
   * 返回值：更新后的关卡。
   */
  @Patch(":id")
  updateLevel(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateLevelDto) {
    return this.adminService.updateLevel(BigInt(id), dto);
  }

  /**
   * 发布关卡。
   * 功能：DRAFT -> PUBLISHED，再次校验 schema。
   * 参数：id - 关卡 id。
   * 返回值：发布后的关卡。
   */
  @Post(":id/publish")
  publishLevel(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.publishLevel(BigInt(id));
  }

  /**
   * 归档关卡。
   * 功能：PUBLISHED -> ARCHIVED。
   * 参数：id - 关卡 id。
   * 返回值：归档后的关卡。
   */
  @Post(":id/archive")
  archiveLevel(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.archiveLevel(BigInt(id));
  }

  /**
   * 复制关卡。
   * 功能：基于现有配置创建 DRAFT 副本。
   * 参数：id - 源关卡 id。
   * 返回值：新关卡摘要。
   */
  @Post(":id/clone")
  cloneLevel(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.cloneLevel(BigInt(id));
  }

  /**
   * 调整关卡排序。
   * 功能：更新 courseId、chapterId 或 sortOrder。
   * 参数：id - 关卡 id；dto - 排序字段。
   * 返回值：更新后的排序信息。
   */
  @Patch(":id/sort")
  updateLevelSort(@Param("id", ParseIntPipe) id: number, @Body() dto: SortLevelDto) {
    return this.adminService.updateLevelSort(BigInt(id), dto);
  }
}
