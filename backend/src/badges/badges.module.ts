import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BadgesController } from "./badges.controller";
import { BadgesService } from "./badges.service";

/** 徽章模块 */
@Module({
  imports: [AuthModule],
  controllers: [BadgesController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
