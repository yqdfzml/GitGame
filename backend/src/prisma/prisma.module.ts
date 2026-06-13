import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/** 全局 Prisma 模块，供各业务模块注入数据库客户端 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
