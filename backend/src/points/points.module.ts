import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PointsController } from "./points.controller";
import { PointsService } from "./points.service";

/** 积分与签到模块 */
@Module({
  imports: [AuthModule],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
