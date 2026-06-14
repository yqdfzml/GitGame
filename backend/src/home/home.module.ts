import { Module } from "@nestjs/common";
import { HomeController } from "./home.controller";
import { HomeService } from "./home.service";
import { LeaderboardModule } from "../leaderboard/leaderboard.module";

/** 首页模块 */
@Module({
  imports: [LeaderboardModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
