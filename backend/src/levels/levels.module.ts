import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PointsModule } from "../points/points.module";
import { LevelsController } from "./levels.controller";
import { LevelsService } from "./levels.service";

/** 关卡模块 */
@Module({
  imports: [AuthModule, PointsModule],
  controllers: [LevelsController],
  providers: [LevelsService],
  exports: [LevelsService],
})
export class LevelsModule {}
