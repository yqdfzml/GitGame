import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminDashboardService } from "./admin-dashboard.service";

/** 管理端 Dashboard 控制器 */
@Controller("admin/dashboard")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  /**
   * 获取 Dashboard 概览。
   * 功能：返回今日运营指标与待处理事项。
   * 参数：无。
   * 返回值：Dashboard 数据。
   */
  @Get()
  getOverview() {
    return this.adminDashboardService.getOverview();
  }
}
