import { Module } from "@nestjs/common";
import { LevelsController } from "./levels.controller";
import { LevelsService } from "./levels.service";

/** 关卡模块 */
@Module({
  controllers: [LevelsController],
  providers: [LevelsService],
  exports: [LevelsService],
})
export class LevelsModule {}
