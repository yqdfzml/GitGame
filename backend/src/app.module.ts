import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./admin/admin.module";
import { AttemptsModule } from "./attempts/attempts.module";
import { AuthModule } from "./auth/auth.module";
import { GitEngineModule } from "./git-engine/git-engine.module";
import { HealthController } from "./health/health.controller";
import { JudgeModule } from "./judge/judge.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";
import { LevelsModule } from "./levels/levels.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";

/** 应用根模块，聚合所有业务模块 */
@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    LevelsModule,
    AttemptsModule,
    GitEngineModule,
    JudgeModule,
    LeaderboardModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
