import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthSessionValidator } from "./auth-session.validator";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AvatarStorageService } from "./avatar-storage.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "./guards/optional-jwt-auth.guard";
import { AdminGuard } from "./guards/admin.guard";

/** 认证模块 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: config.get<number>("JWT_EXPIRES_IN") },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionValidator,
    AvatarStorageService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    AdminGuard,
  ],
  exports: [AuthService, AuthSessionValidator, JwtModule, JwtAuthGuard, OptionalJwtAuthGuard, AdminGuard],
})
export class AuthModule {}
