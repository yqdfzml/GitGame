import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthRequest, JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PointsService } from "./points.service";

/** 积分与签到控制器 */
@Controller("points")
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  /**
   * 获取当前用户积分钱包。
   * 功能：返回余额、连签与今日签到状态。
   * 参数：req - 鉴权请求。
   * 返回值：PointWalletResponse。
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  getWallet(@Req() req: AuthRequest) {
    const userId = BigInt(req.user!.sub);
    return this.pointsService.getWalletSummary(userId);
  }

  /**
   * 每日签到。
   * 功能：按上海自然日发放积分，当天重复调用幂等。
   * 参数：req - 鉴权请求。
   * 返回值：签到后的钱包摘要。
   */
  @Post("check-in")
  @UseGuards(JwtAuthGuard)
  checkIn(@Req() req: AuthRequest) {
    const userId = BigInt(req.user!.sub);
    return this.pointsService.checkIn(userId);
  }

  /**
   * 获取近一年解题日历。
   * 功能：供首页 GitHub 风格热力图展示每日通关次数。
   * 参数：req - 鉴权请求。
   * 返回值：PracticeCalendarResponse。
   */
  @Get("practice-calendar")
  @UseGuards(JwtAuthGuard)
  getPracticeCalendar(@Req() req: AuthRequest) {
    const userId = BigInt(req.user!.sub);
    return this.pointsService.getPracticeCalendar(userId);
  }
}
