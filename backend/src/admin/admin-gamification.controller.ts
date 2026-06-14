import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGamificationService } from "./admin-gamification.service";

/** 管理端游戏化运营控制器 */
@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminGamificationController {
  constructor(private readonly adminGamificationService: AdminGamificationService) {}

  /**
   * 分页列出积分钱包。
   * 功能：查看用户积分余额与连签情况。
   * 参数：search、page、pageSize - 查询参数。
   * 返回值：分页钱包列表。
   */
  @Get("points/wallets")
  listWallets(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.adminGamificationService.listWallets({
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  /**
   * 分页列出积分流水。
   * 功能：查看签到与解锁等积分变动记录。
   * 参数：search、userId、page、pageSize - 查询参数。
   * 返回值：分页流水列表。
   */
  @Get("points/ledgers")
  listLedgers(
    @Query("search") search?: string,
    @Query("userId") userId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.adminGamificationService.listLedgers({
      search,
      userId: userId ? BigInt(userId) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  /**
   * 分页列出关卡解锁记录。
   * 功能：查看用户花积分解锁了哪些关卡。
   * 参数：search、userId、levelId、page、pageSize - 查询参数。
   * 返回值：分页解锁列表。
   */
  @Get("points/unlocks")
  listUnlocks(
    @Query("search") search?: string,
    @Query("userId") userId?: string,
    @Query("levelId") levelId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.adminGamificationService.listUnlocks({
      search,
      userId: userId ? BigInt(userId) : undefined,
      levelId: levelId ? BigInt(levelId) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  /**
   * 获取徽章定义。
   * 功能：只读展示全部徽章配置。
   * 参数：无。
   * 返回值：徽章定义数组。
   */
  @Get("badges/definitions")
  listBadgeDefinitions() {
    return this.adminGamificationService.listBadgeDefinitions();
  }

  /**
   * 查询排行榜。
   * 功能：全局或按关卡查询排行榜。
   * 参数：levelId、limit - 查询参数。
   * 返回值：排行榜条目数组。
   */
  @Get("leaderboard")
  getLeaderboard(@Query("levelId") levelId?: string, @Query("limit") limit?: string) {
    return this.adminGamificationService.getLeaderboard(
      levelId ? BigInt(levelId) : undefined,
      limit ? Number(limit) : 50,
    );
  }
}
