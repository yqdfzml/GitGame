import { Controller, Get, Query } from "@nestjs/common";
import { LeaderboardService } from "./leaderboard.service";

/** 排行榜控制器 */
@Controller("leaderboard")
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * 获取排行榜。
   * 功能：未传 levelId 时按做题积分排序；传 levelId 时按单关得分排序。
   * 参数：levelId - 可选关卡 id；limit - 条数上限。
   * 返回值：排行榜条目数组。
   */
  @Get()
  getLeaderboard(
    @Query("levelId") levelId?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 20;
    const parsedLevelId = levelId ? BigInt(levelId) : undefined;
    return this.leaderboardService.getLeaderboard(parsedLevelId, parsedLimit);
  }
}
