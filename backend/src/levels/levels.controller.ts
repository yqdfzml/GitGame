import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { LevelsService } from "./levels.service";

/** 公开关卡控制器 */
@Controller("levels")
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  /**
   * 获取已发布关卡列表。
   * 功能：按 sortOrder 返回所有 PUBLISHED 关卡。
   * 参数：无。
   * 返回值：关卡摘要数组。
   */
  @Get()
  listLevels() {
    return this.levelsService.listPublishedLevels();
  }

  /**
   * 获取关卡详情。
   * 功能：返回关卡说明和 initialState（不含 goal 答案）。
   * 参数：id - 关卡 id。
   * 返回值：关卡详情。
   */
  @Get(":id")
  getLevel(@Param("id", ParseIntPipe) id: number) {
    return this.levelsService.getPublishedLevel(BigInt(id));
  }
}
