import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BadgesModule } from "../badges/badges.module";
import { LeaderboardModule } from "../leaderboard/leaderboard.module";
import { UsersModule } from "../users/users.module";
import { AdminAttemptsController } from "./admin-attempts.controller";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminGamificationController } from "./admin-gamification.controller";
import { AdminController } from "./admin.controller";
import { AdminInvitesController } from "./admin-invites.controller";
import { AdminUsersController } from "./admin-users.controller";
import { AdminAttemptsService } from "./admin-attempts.service";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminGamificationService } from "./admin-gamification.service";
import { AdminInvitesService } from "./admin-invites.service";
import { AdminService } from "./admin.service";
import { AdminUsersService } from "./admin-users.service";

/** 管理后台模块 */
@Module({
  imports: [AuthModule, UsersModule, BadgesModule, LeaderboardModule],
  controllers: [
    AdminController,
    AdminUsersController,
    AdminAttemptsController,
    AdminInvitesController,
    AdminDashboardController,
    AdminGamificationController,
  ],
  providers: [
    AdminService,
    AdminUsersService,
    AdminAttemptsService,
    AdminInvitesService,
    AdminDashboardService,
    AdminGamificationService,
  ],
})
export class AdminModule {}
