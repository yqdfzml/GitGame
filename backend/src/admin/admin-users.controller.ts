import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { AuthRequest, JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminUsersService } from "./admin-users.service";
import {
  AdminUserListQueryDto,
  UpdateUserDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from "./dto/admin-user.dto";

/** 管理端用户控制器 */
@Controller("admin/users")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /**
   * 分页列出用户。
   * 功能：支持搜索与角色、状态筛选。
   * 参数：search、role、status、page、pageSize - 查询参数。
   * 返回值：分页用户列表。
   */
  @Get()
  listUsers(@Query() query: AdminUserListQueryDto) {
    return this.adminUsersService.listUsers({
      search: query.search,
      role: query.role,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  /**
   * 获取用户详情。
   * 功能：返回运营排查所需的完整用户快照。
   * 参数：id - 用户 id。
   * 返回值：用户详情。
   */
  @Get(":id")
  getUser(@Param("id", ParseIntPipe) id: number) {
    return this.adminUsersService.getUserDetail(BigInt(id));
  }

  /**
   * 更新用户资料。
   * 功能：修改昵称、邮箱、角色与状态。
   * 参数：id - 用户 id；dto - 更新字段；req - 当前管理员请求。
   * 返回值：更新后的用户摘要。
   */
  @Patch(":id")
  updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthRequest,
  ) {
    const operatorId = BigInt(req.user!.sub);
    return this.adminUsersService.updateUser(BigInt(id), dto, operatorId);
  }

  /**
   * 删除用户。
   * 功能：永久删除账号及关联数据。
   * 参数：id - 用户 id；req - 当前管理员请求。
   * 返回值：删除结果。
   */
  @Delete(":id")
  deleteUser(@Param("id", ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const operatorId = BigInt(req.user!.sub);
    return this.adminUsersService.deleteUser(BigInt(id), operatorId);
  }

  /**
   * 更新用户状态。
   * 功能：启用或禁用账号。
   * 参数：id - 用户 id；dto - 新状态；req - 当前管理员请求。
   * 返回值：更新后的用户摘要。
   */
  @Patch(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: AuthRequest,
  ) {
    const operatorId = BigInt(req.user!.sub);
    return this.adminUsersService.updateUserStatus(BigInt(id), dto.status, operatorId);
  }

  /**
   * 更新用户角色。
   * 功能：调整 USER / ADMIN 角色。
   * 参数：id - 用户 id；dto - 新角色；req - 当前管理员请求。
   * 返回值：更新后的用户摘要。
   */
  @Patch(":id/role")
  updateRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: AuthRequest,
  ) {
    const operatorId = BigInt(req.user!.sub);
    return this.adminUsersService.updateUserRole(BigInt(id), dto.role, operatorId);
  }

  /**
   * 撤销用户登录态。
   * 功能：作废目标用户全部 refresh token。
   * 参数：id - 用户 id。
   * 返回值：撤销数量。
   */
  @Post(":id/revoke-sessions")
  revokeSessions(@Param("id", ParseIntPipe) id: number) {
    return this.adminUsersService.revokeUserSessions(BigInt(id));
  }
}
