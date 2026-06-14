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
import { CreateLevelDto, UpdateLevelDto } from "./dto/admin-level.dto";

/** 管理后台控制器 */
@Controller("admin/levels")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 列出全部关卡。
   * 功能：供管理后台左侧列表与章节筛选使用。
   * 参数：chapterId - 可选章节筛选。
   * 返回值：关卡摘要数组。
   */
  @Get()
  listLevels(@Query("chapterId") chapterId?: string) {
    return this.adminService.listLevels(chapterId);
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
}
