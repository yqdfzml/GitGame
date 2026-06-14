import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BadgesModule } from "../badges/badges.module";
import { UsersModule } from "../users/users.module";
import { AdminController } from "./admin.controller";
import { AdminUsersController } from "./admin-users.controller";
import { AdminService } from "./admin.service";
import { AdminUsersService } from "./admin-users.service";

/** 管理后台模块 */
@Module({
  imports: [AuthModule, UsersModule, BadgesModule],
  controllers: [AdminController, AdminUsersController],
  providers: [AdminService, AdminUsersService],
})
export class AdminModule {}
