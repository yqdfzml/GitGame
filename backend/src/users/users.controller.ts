import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthRequest, JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsersService } from "./users.service";

/** 用户控制器，提供个人统计接口 */
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 获取当前用户学习统计。
   * 功能：返回通关数、总分等摘要。
   * 参数：req - 鉴权请求。
   * 返回值：统计 JSON。
   */
  @Get("me/stats")
  @UseGuards(JwtAuthGuard)
  getMyStats(@Req() req: AuthRequest) {
    const userId = BigInt(req.user!.sub);
    return this.usersService.getUserStats(userId);
  }
}
