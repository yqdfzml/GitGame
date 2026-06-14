import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AttemptStatus } from "@prisma/client";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminAttemptsService } from "./admin-attempts.service";

/** 管理端练习记录控制器 */
@Controller("admin/attempts")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAttemptsController {
  constructor(private readonly adminAttemptsService: AdminAttemptsService) {}

  /**
   * 分页列出 attempt。
   * 功能：支持用户搜索、关卡、状态筛选。
   * 参数：search、levelId、userId、status、page、pageSize - 查询参数。
   * 返回值：分页 attempt 列表。
   */
  @Get()
  listAttempts(
    @Query("search") search?: string,
    @Query("levelId") levelId?: string,
    @Query("userId") userId?: string,
    @Query("status") status?: AttemptStatus,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.adminAttemptsService.listAttempts({
      search,
      levelId: levelId ? BigInt(levelId) : undefined,
      userId: userId ? BigInt(userId) : undefined,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  /**
   * 获取 attempt 详情。
   * 功能：返回命令序列与每步反馈。
   * 参数：id - attempt id。
   * 返回值：attempt 详情。
   */
  @Get(":id")
  getAttempt(@Param("id", ParseIntPipe) id: number) {
    return this.adminAttemptsService.getAttemptDetail(BigInt(id));
  }
}
