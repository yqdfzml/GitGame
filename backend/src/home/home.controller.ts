import { Controller, Get, Query } from "@nestjs/common";
import { HomeOverviewQueryDto } from "./dto/home-overview-query.dto";
import { HomeService } from "./home.service";

/** 首页控制器 */
@Controller("home")
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /**
   * 获取首页概览。
   * 功能：返回排行榜与通关动态播报数据。
   * 参数：query - 条数上限等查询参数。
   * 返回值：首页概览 DTO。
   */
  @Get("overview")
  getOverview(@Query() query: HomeOverviewQueryDto) {
    return this.homeService.getOverview(query.leaderboardLimit ?? 10, query.activityLimit ?? 20);
  }
}
