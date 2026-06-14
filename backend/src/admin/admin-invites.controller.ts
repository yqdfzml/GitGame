import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminInvitesService } from "./admin-invites.service";
import { CreateInviteDto } from "./dto/admin-invite.dto";

/** 管理端邀请码控制器 */
@Controller("admin/invites")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminInvitesController {
  constructor(private readonly adminInvitesService: AdminInvitesService) {}

  /**
   * 列出全部邀请码。
   * 功能：查看创建记录与使用状态。
   * 参数：无。
   * 返回值：邀请码数组。
   */
  @Get()
  listInvites() {
    return this.adminInvitesService.listInvites();
  }

  /**
   * 创建邀请码。
   * 功能：生成新英雄帖，支持备注与过期时间。
   * 参数：dto - 创建参数。
   * 返回值：新邀请码摘要。
   */
  @Post()
  createInvite(@Body() dto: CreateInviteDto) {
    return this.adminInvitesService.createInvite(dto);
  }

  /**
   * 作废邀请码。
   * 功能：使未使用的邀请码立即失效。
   * 参数：id - 邀请码 id。
   * 返回值：作废结果。
   */
  @Post(":id/revoke")
  revokeInvite(@Param("id", ParseIntPipe) id: number) {
    return this.adminInvitesService.revokeInvite(BigInt(id));
  }
}
