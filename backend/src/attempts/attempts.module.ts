import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BadgesModule } from "../badges/badges.module";
import { GitEngineModule } from "../git-engine/git-engine.module";
import { JudgeModule } from "../judge/judge.module";
import { LevelsModule } from "../levels/levels.module";
import { PointsModule } from "../points/points.module";
import { AttemptsController } from "./attempts.controller";
import { AttemptsService } from "./attempts.service";

/** 练习会话模块 */
@Module({
  imports: [AuthModule, LevelsModule, GitEngineModule, JudgeModule, BadgesModule, PointsModule],
  controllers: [AttemptsController],
  providers: [AttemptsService],
})
export class AttemptsModule {}
