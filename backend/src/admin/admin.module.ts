import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BadgesModule } from "../badges/badges.module";
import { UsersModule } from "../users/users.module";
import { AdminAttemptsController } from "./admin-attempts.controller";
import { AdminController } from "./admin.controller";
import { AdminUsersController } from "./admin-users.controller";
import { AdminAttemptsService } from "./admin-attempts.service";
import { AdminService } from "./admin.service";
import { AdminUsersService } from "./admin-users.service";

/** 管理后台模块 */
@Module({
  imports: [AuthModule, UsersModule, BadgesModule],
  controllers: [AdminController, AdminUsersController, AdminAttemptsController],
  providers: [AdminService, AdminUsersService, AdminAttemptsService],
})
export class AdminModule {}
