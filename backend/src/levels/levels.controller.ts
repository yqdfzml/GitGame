import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthRequest, JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { LevelsService } from "./levels.service";

/** 公开关卡控制器 */
@Controller("levels")
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  /**
   * 获取已发布关卡列表。
   * 功能：按 sortOrder 返回所有 PUBLISHED 关卡及解锁状态。
   * 参数：req - 可选鉴权请求。
   * 返回值：关卡摘要数组。
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  listLevels(@Req() req: AuthRequest) {
    const userId = req.user ? BigInt(req.user.sub) : undefined;
    return this.levelsService.listPublishedLevels(userId);
  }

  /**
   * 获取关卡详情。
   * 功能：未解锁关卡返回 403，不返回 initialState。
   * 参数：id - 关卡 id；req - 可选鉴权请求。
   * 返回值：关卡详情。
   */
  @Get(":id")
  @UseGuards(OptionalJwtAuthGuard)
  getLevel(@Param("id", ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user ? BigInt(req.user.sub) : undefined;
    return this.levelsService.getPublishedLevel(BigInt(id), userId);
  }

  /**
   * 消耗积分解锁关卡。
   * 功能：事务内扣分并写入解锁记录。
   * 参数：id - 关卡 id；req - 鉴权请求。
   * 返回值：解锁后的关卡状态。
   */
  @Post(":id/unlock")
  @UseGuards(JwtAuthGuard)
  unlockLevel(@Param("id", ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = BigInt(req.user!.sub);
    return this.levelsService.unlockLevel(userId, BigInt(id));
  }
}
