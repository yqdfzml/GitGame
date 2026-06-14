import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { LeaderboardQueryDto } from "./dto/leaderboard-query.dto";
import { LeaderboardService } from "./leaderboard.service";

/** 排行榜控制器 */
@Controller("leaderboard")
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * 获取排行榜。
   * 功能：未传 levelId 时按做题积分排序；传 levelId 时按单关得分排序。
   * 参数：query - levelId 与 limit。
   * 返回值：排行榜条目数组。
   */
  @Get()
  getLeaderboard(@Query() query: LeaderboardQueryDto) {
    let parsedLevelId: bigint | undefined;
    if (query.levelId) {
      try {
        parsedLevelId = BigInt(query.levelId);
      } catch {
        throw new BadRequestException("levelId 无效");
      }
    }
    return this.leaderboardService.getLeaderboard(parsedLevelId, query.limit ?? 20);
  }
}
