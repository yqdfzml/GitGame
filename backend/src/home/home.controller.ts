import { Controller, Get, Query } from "@nestjs/common";
import { HomeService } from "./home.service";

/** 首页控制器 */
@Controller("home")
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /**
   * 获取首页概览。
   * 功能：返回排行榜与通关动态播报数据。
   * 参数：leaderboardLimit - 排行榜条数；activityLimit - 动态条数。
   * 返回值：首页概览 DTO。
   */
  @Get("overview")
  getOverview(
    @Query("leaderboardLimit") leaderboardLimit?: string,
    @Query("activityLimit") activityLimit?: string,
  ) {
    const parsedLeaderboardLimit = leaderboardLimit ? Number(leaderboardLimit) : 10;
    const parsedActivityLimit = activityLimit ? Number(activityLimit) : 20;
    return this.homeService.getOverview(parsedLeaderboardLimit, parsedActivityLimit);
  }
}
