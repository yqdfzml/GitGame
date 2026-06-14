import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthRequest, JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { BadgesService } from "./badges.service";

/** 徽章控制器，提供成就页数据 */
@Controller("users/me")
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  /**
   * 获取当前用户徽章与称号。
   * 功能：同步解锁状态并返回完整徽章列表。
   * 参数：req - 鉴权请求。
   * 返回值：徽章页 JSON。
   */
  @Get("badges")
  @UseGuards(JwtAuthGuard)
  getMyBadges(@Req() req: AuthRequest) {
    const userId = BigInt(req.user!.sub);
    return this.badgesService.syncAndGetUserBadges(userId);
  }
}
